FilePond.registerPlugin(
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType,
  FilePondPluginFileEncode,
  FilePondPluginImageResize
);

FilePond.setOptions({
  stylePanelAspectRatio: 150 / 100,
  imageResizeTargetWidth: 100,
  imageResizeTargetHeight: 150,
  acceptedFileTypes: ["image/*"],
  imageTransformOutputQuality: 50,
  imageTransform: {
    maxWidth: 100,
    maxHeight: 150,
  },
  server: {
    process: {
      url: (fieldName, file, metadata, load, error, progress, abort) => {
        const urlSplit = window.location.pathname.split("/");
        const tripID = urlSplit[urlSplit.indexOf("tripFolders") + 1];
        return `/${tripID}/addFile`;
      },
      method: "POST",
      withCredentials: false,
      onload: (response) => {
        const jsonResponse = JSON.parse(response);
        return jsonResponse.fileUrl;
      },
    },
  },
  // instantUpload: false,
});

// // Handle form submission
// const form = document.getElementById("add-file");
// form.addEventListener("submit", (e) => {
//   e.preventDefault();

//   // Manually process the FilePond files
//   pond.processFiles().then(() => {
//     form.submit();
//   });
// });

FilePond.parse(document.body);
