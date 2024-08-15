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
