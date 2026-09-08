# Makefile for Jupyterlab extensions version 1.38
# changelog:
#   1.38 - keep `python -m build` as the build command, approve blocked npm install
#          scripts, and audit-fix on upgrade.
#          A local edit in one project had swapped `python -m build` for
#          `jupyter-builder build`; canonical 1.37 never carried that. Measured, the
#          swap breaks the build twice over. jupyter-builder emits
#          no sdist and no wheel, so nothing populated dist/ - and `install`
#          (pip install dist/*.whl) plus `publish` (twine upload dist/*) both read
#          dist/, so publish pushed the npm tarball and then died at twine with the
#          npm version already consumed and unrepublishable. It also exits 1 outright
#          when run after `clean`: "Cannot find module lib/index.js", because it never
#          runs tsc. `python -m build` needs no help - its hatch-jupyter-builder hook
#          runs the pyproject `build_cmd` (build:prod = tsc + labextension) during the
#          sdist stage, then builds the wheel from that sdist. Verified from a tree
#          with no lib/, no labextension/ and no dist/: both artefacts, exit 0.
#          publish now asserts dist/ holds a wheel and an sdist BEFORE the npm push,
#          so a broken build cannot desynchronise the two registries.
#          npm >= 11.6 blocks dependency install scripts until approved and records
#          the approval in package.json under "allowScripts", so a transitive
#          package needing a lifecycle script installs unbuilt and fails at runtime.
#          install_dependencies now approves every package in ALLOW_SCRIPTS_PKGS.
#          upgrade runs `npm audit fix --force` after `jlpm up`. WARNING: --force
#          accepts breaking changes, including downgrades - on this project it
#          proposes @jupyterlab/testutils@0.2.4 in place of ^4.6.3. Review the diff
#          to package.json and the lockfiles after every upgrade. The trailing
#          `|| true` is required: npm audit fix exits 1 whenever any advisory
#          remains unfixed, which is the normal outcome, and would abort the target.
#          check_dependencies / install_dependencies now also gate the `build` module
#          and `jlpm` (supplied by the jupyter_builder distribution), the two commands
#          every build reaches for, so a fresh clone self-heals instead of dying
#          mid-build on a missing tool.
#   1.37 - pin the global install prefix to the nodeenv when installing yarn + rimraf.
#          `npm install -g` honours a user-level `prefix=` in ~/.npmrc even when run
#          from the nodeenv's own npm, so on any machine that sets one the binaries
#          landed in that prefix instead of $(NODEENV)/bin. check_dependencies tests
#          for $(NODEENV)/bin/yarn, which then never became true, so every make
#          invocation re-ran install_dependencies and reinstalled yarn - it never
#          reported "All dependencies are installed". Passing --prefix explicitly
#          overrides the config for that one command and leaves ~/.npmrc untouched.
#   1.36 - `test` runs the Python suite too, not just jlpm. It ran `jlpm test` alone,
#          so on any extension with a server side a Python regression passed local
#          verification and only failed in CI. pytest now runs whenever the package
#          has a tests/ directory, and is skipped with a message when it does not,
#          so frontend-only extensions are unaffected. No --cov: coverage is a CI
#          concern, and requiring pytest-cov would make `make test` fail on an
#          otherwise working dev env. Also corrects the author address to the
#          +github alias used everywhere else.
#   1.35 - resolve node and npm exclusively from the project-local nodeenv via $(NODE)
#          and $(NPM) instead of bare names, and read VERSION lazily at recipe time
#          rather than at parse time. VERSION := $(shell command -v node ...) was
#          evaluated before any target ran, so on a fresh clone (no .nodeenv yet) it
#          fell back to 0.0.0, increment_version's sed matched nothing, and the build
#          published the already-published version while printing a successful bump.
#          It only appeared to work where an ambient node happened to be on PATH.
#          increment_version now depends on check_dependencies and fails loudly when
#          the version cannot be read or does not actually change.
#   1.34 - build formats the lockfiles with `jlpm prettier` (the project's pinned
#          toolchain) instead of `npx prettier`, which fails with "prettier: Permission
#          denied" against a yarn-berry node_modules where the .cjs lacks the exec bit
#   1.33 - check_dependencies now also treats a missing/empty node_modules as a missing
#          dependency, and install_dependencies runs `jlpm install` to populate it, so
#          `make install`/`test` self-heal a fresh env without needing a full build first
#   1.32 - use a project-local nodeenv at .nodeenv/ instead of overwriting the python
#          prefix via `nodeenv -p` (which used to fail with "Text file busy" when the
#          existing node binary was held open). PATH=.nodeenv/bin:$PATH is exported so
#          every target transparently picks up the pinned local node + npm + yarn.
#          install_dependencies now guards each install step - only what's missing
#          gets installed. mrproper removes .nodeenv too.
#   1.31 - mrproper now removes ui-tests/node_modules (Playwright browser binaries)
#   1.30 - check twine in check_dependencies, ensure publish doesn't fail on missing twine
#   1.29 - replace yarn with jlpm, add prettier format, auto-commit and push after publish
#   1.28 - initial versioned Makefile
# author: Stellars Henson <konrad.jelen+github@gmail.com>
# License: MIT Open Source License

.PHONY: build install clean uninstall publish dependencies mrproper increment_version install_dependencies check_dependencies upgrade help test
.DEFAULT_GOAL := help

# Project-local node environment - keeps node/npm/yarn pinned per project and out of
# the python prefix. Created by `install_dependencies` and torn down by `mrproper`.
NODEENV := $(CURDIR)/.nodeenv
NODE := $(NODEENV)/bin/node
NPM := $(NODEENV)/bin/npm
export PATH := $(NODEENV)/bin:$(PATH)

# Read the current version from package.json using the project-local node only.
# Deliberately lazy (`=`, not `:=`): a parse-time read happens before check_dependencies
# has created the nodeenv, and an ambient node on PATH would silently mask that.
VERSION = $(shell $(NODE) -p "require('./package.json').version" 2>/dev/null)

# Python package name, taken from the labextension output dir. Lazy for the same
# reason as VERSION: $(NODE) does not exist until check_dependencies has run.
PYTHON_NAME = $(shell $(NODE) -p "require('./package.json').jupyterlab.outputDir.split('/')[0]" 2>/dev/null)

# Dependencies whose install scripts npm must be allowed to run. npm >= 11.6 blocks
# lifecycle scripts until approved, recording each approval in package.json under
# "allowScripts". Space-separated; extend per project.
ALLOW_SCRIPTS_PKGS := @fortawesome/fontawesome-free

## increment project version
increment_version: check_dependencies
	@CURRENT_VERSION="$(VERSION)"; \
	if [ -z "$$CURRENT_VERSION" ]; then \
		echo "increment_version: cannot read version from package.json via $(NODE)" >&2; \
		exit 1; \
	fi; \
	echo "Current version: $$CURRENT_VERSION"; \
	NEW_VERSION="$${CURRENT_VERSION%.*}.$$(( $${CURRENT_VERSION##*.} + 1 ))"; \
	sed -i "s/\"version\": \"$$CURRENT_VERSION\"/\"version\": \"$$NEW_VERSION\"/" package.json; \
	if ! grep -q "\"version\": \"$$NEW_VERSION\"" package.json; then \
		echo "increment_version: package.json still reports $$CURRENT_VERSION - not bumped" >&2; \
		exit 1; \
	fi; \
	echo "New version: $$NEW_VERSION"

# `python -m build` is the whole build. Its hatch-jupyter-builder hook runs the
# `build_cmd` from pyproject.toml (build:prod = tsc + labextension) and then emits the
# sdist and wheel into dist/, which install and publish both read. Do not swap in a
# bare `jupyter-builder build`: it emits no distribution at all, and after `clean` it
# aborts with "Cannot find module lib/index.js" because it never runs tsc.
## build packages
build: clean check_dependencies increment_version
	$(NPM) install
	jlpm install
	jlpm prettier
	python -m build

## install package
install: build
	pip install dist/*.whl --force-reinstall

## run tests
test: check_dependencies
	jlpm test
	@if [ -d "$(PYTHON_NAME)/tests" ]; then \
		pytest -vv -r ap; \
	else \
		echo "test: no $(PYTHON_NAME)/tests directory - skipping pytest"; \
	fi

## clean builds and installables
clean: uninstall  check_dependencies
	@[ -x "$(NPM)" ] && $(NPM) run clean || true
	@[ -x "$(NPM)" ] && $(NPM) run clean:labextension || true
	rm -rf dist lib || true

## uninstall package
uninstall:  check_dependencies
	pip uninstall -y dist/*.whl 2>/dev/null || true

## check if required dependencies are installed in the project-local nodeenv
check_dependencies:
	@echo "Checking dependencies..."
	@MISSING=""; \
	[ -x "$(NODEENV)/bin/node" ] || MISSING="$$MISSING node"; \
	[ -x "$(NODEENV)/bin/npm" ] || MISSING="$$MISSING npm"; \
	[ -x "$(NODEENV)/bin/yarn" ] || MISSING="$$MISSING yarn"; \
	python -m twine --version >/dev/null 2>&1 || MISSING="$$MISSING twine"; \
	python -m build --version >/dev/null 2>&1 || MISSING="$$MISSING build"; \
	command -v jlpm >/dev/null 2>&1 || MISSING="$$MISSING jlpm"; \
	{ [ -d node_modules ] && [ -n "$$(ls -A node_modules 2>/dev/null)" ]; } || MISSING="$$MISSING node_modules"; \
	if [ -n "$$MISSING" ]; then \
		echo "Missing dependencies:$$MISSING"; \
		echo "Installing missing dependencies..."; \
		$(MAKE) install_dependencies; \
	else \
		echo "All dependencies are installed."; \
	fi

## publish package to npm and PyPI
publish: check_dependencies install
	@ls dist/*.whl >/dev/null 2>&1 && ls dist/*.tar.gz >/dev/null 2>&1 || { \
		echo "publish: dist/ holds no wheel or sdist - run make build first" >&2; \
		exit 1; \
	}
	$(NPM) publish --access public
	python -m twine upload dist/*
	git add package.json package-lock.json
	git commit -m "chore: post-publish $$($(NODE) -p "require('./package.json').version") package metadata"
	git push

## install required build dependencies into the project-local nodeenv (only what's missing)
install_dependencies:
	@if ! python -m twine --version >/dev/null 2>&1; then \
		echo "Installing twine..."; \
		pip install twine; \
	fi
	@if ! python -m build --version >/dev/null 2>&1; then \
		echo "Installing build..."; \
		pip install build; \
	fi
	@if ! command -v jlpm >/dev/null 2>&1; then \
		echo "Installing jupyter_builder (supplies jlpm)..."; \
		pip install jupyter_builder; \
	fi
	@if [ ! -x "$(NODEENV)/bin/node" ] || [ ! -x "$(NODEENV)/bin/npm" ]; then \
		echo "Creating project-local node environment at $(NODEENV)..."; \
		python -c "import nodeenv" >/dev/null 2>&1 || pip install nodeenv; \
		nodeenv --node=lts --prebuilt "$(NODEENV)"; \
	fi
	@if [ ! -x "$(NODEENV)/bin/yarn" ]; then \
		echo "Installing yarn + rimraf into $(NODEENV)..."; \
		"$(NODEENV)/bin/npm" install -g --prefix "$(NODEENV)" yarn rimraf; \
	fi
	@if [ ! -d node_modules ] || [ -z "$$(ls -A node_modules 2>/dev/null)" ]; then \
		echo "Installing project node_modules (jlpm install)..."; \
		jlpm install; \
	fi
	@for pkg in $(ALLOW_SCRIPTS_PKGS); do \
		if $(NPM) install-scripts approve "$$pkg" >/dev/null 2>&1; then \
			echo "install scripts approved: $$pkg"; \
		else \
			echo "install scripts not approved: $$pkg (absent from the tree, or npm < 11.6)"; \
		fi; \
	done
	@echo "node:  $$($(NODEENV)/bin/node --version 2>/dev/null) ($(NODEENV)/bin/node)"
	@echo "npm:   $$($(NODEENV)/bin/npm --version 2>/dev/null)"
	@echo "yarn:  $$($(NODEENV)/bin/yarn --version 2>/dev/null)"

# `npm audit fix --force` accepts breaking changes and downgrades, so review the diff to
# package.json and the lockfiles after every upgrade. It exits 1 whenever any advisory
# stays unfixed - the normal outcome - hence the `|| true` that keeps the target green.
## upgrade all npm and yarn dependencies
upgrade: check_dependencies
	jlpm up
	$(NPM) audit fix --force || true

## cleanup all build and metabuild artefacts (including the project-local nodeenv)
mrproper: clean uninstall
	rm -rf node_modules .yarn ui-tests/node_modules .nodeenv || true

## prints the list of available commands
help:
	@echo ""
	@echo "$$(tput bold)Available rules:$$(tput sgr0)"
	@sed -n -e "/^## / { \
		h; \
		s/.*//; \
		:doc" \
		-e "H; \
		n; \
		s/^## //; \
		t doc" \
		-e "s/:.*//; \
		G; \
		s/\\n## /---/; \
		s/\\n/ /g; \
		p; \
	}" ${MAKEFILE_LIST} \
	| LC_ALL='C' sort --ignore-case \
	| awk -F '---' \
		-v ncol=$$(tput cols) \
		-v indent=19 \
		-v col_on="$$(tput setaf 6)" \
		-v col_off="$$(tput sgr0)" \
	'{ \
		printf "%s%*s%s ", col_on, -indent, $$1, col_off; \
		n = split($$2, words, " "); \
		line_length = ncol - indent; \
		for (i = 1; i <= n; i++) { \
			line_length -= length(words[i]) + 1; \
			if (line_length <= 0) { \
				line_length = ncol - indent - length(words[i]) - 1; \
				printf "\n%*s ", -indent, " "; \
			} \
			printf "%s ", words[i]; \
		} \
		printf "\n"; \
	}' 
	@echo ""


# EOF

