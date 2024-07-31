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

module.exports = { CustomErr, setWildcardError };
