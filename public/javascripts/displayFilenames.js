document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("file-upload-input");
  const fileEditInput = document.getElementById("file-edit-upload-input");
  const titleInput = document.getElementById("title-input");
  const titleEditInput = document.getElementById("title-edit-input");

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      // Check if a file was selected
      if (fileInput.files.length > 0) {
        const fileName = fileInput.files[0].name;
        titleInput.value =
          titleInput.value === "" ? fileName : titleInput.value; // Set the title input value to the file name
      } else {
        titleInput.value = ""; // Clear the title input if no file is selected
      }
    });
  }

  if (fileEditInput) {
    fileEditInput.addEventListener("change", () => {
      if (fileEditInput.files.length > 0) {
        const fileName = fileEditInput.files[0].name;
        titleEditInput.value =
          titleEditInput.value === "" ? fileName : titleEditInput.value; // Set the title input value to the file name
      } else {
        titleEditInput.value = ""; // Clear the title input if no file is selected
      }
    });
  }
});
