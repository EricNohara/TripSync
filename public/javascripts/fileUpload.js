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
});

FilePond.parse(document.body);
