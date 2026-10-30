"""Server configuration for integration tests.

!! Never use this configuration in production because it
opens the server to the world and provide access to JupyterLab
JavaScript objects through the global window variable.
"""
import os
from tempfile import mkdtemp

from jupyterlab.galata import configure_jupyter_server

configure_jupyter_server(c)

# Uncomment to set server log level to debug level
# c.ServerApp.log_level = "DEBUG"

c.ServerApp.port = int(os.environ.get("JUPYTER_TEST_PORT") or "8888")
c.LabApp.user_settings_dir = mkdtemp(prefix="galata-settings-")
