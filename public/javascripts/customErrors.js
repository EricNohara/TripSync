class CustomErr extends Error {
  constructor(errorMessage) {
    super(errorMessage);
    this.name = "CustomErr";
  }
}

function setWildcardError(error, errorMessage = "") {
  if (!(error instanceof CustomErr)) return new CustomErr(errorMessage);
  return error;
}

function queryAppendError(path, error) {
  return `${path}?errorMessage=${encodeURIComponent(error.message)}`;
}

module.exports = { CustomErr, setWildcardError, queryAppendError };
