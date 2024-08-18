document.addEventListener("DOMContentLoaded", function () {
  const filterForm = document.getElementById("filter-form");

  if (filterForm) {
    const selects = filterForm.querySelectorAll("select");
    selects.forEach((select) => {
      select.addEventListener("change", () => {
        filterForm.submit(); // Submit the form whenever a select option is changed
      });
    });
  }
});

const submitOnceForms = document.querySelectorAll(".submit-once-form");

submitOnceForms.forEach((form) => {
  const submitOnceButton = form.querySelector(".submit-once-button");
  const dummyButton = form.querySelector(".dummy-button");
  let isEnterPressed = false;

  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      if (!isEnterPressed && form.checkValidity()) {
        submitOnceButton.classList.add("hidden");
        dummyButton.classList.remove("hidden");
        isEnterPressed = true;
      } else {
        e.preventDefault();
      }
    }
  });

  submitOnceButton.addEventListener("click", () => {
    if (form.checkValidity()) {
      submitOnceButton.classList.add("hidden");
      dummyButton.classList.remove("hidden");
    } else {
      form.reportValidity();
    }
  });
});
