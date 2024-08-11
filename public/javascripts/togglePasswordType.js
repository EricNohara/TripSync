const passwordInputs = document.querySelectorAll(".password-input");

function togglePasswordType() {
  passwordInputs.forEach((x) => {
    if (x.type === "password") {
      x.type = "text";
    } else {
      x.type = "password";
    }
  });
}
