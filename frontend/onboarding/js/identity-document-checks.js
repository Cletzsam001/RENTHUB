
/* =========================================================
  RentHUB identity document checks
   Collects required identity documents.
   No OCR, face detection, or face matching.
   ========================================================= */

function verifyIdentity(idFile, selfieFile) {
  // Both documents are required.
  if (!idFile || !selfieFile) {
    return {
      ok: false,
      message: "Please upload both your government ID and selfie."
    };
  }

  // Confirm that both selected files are images.
  if (
    !idFile.type.startsWith("image/") ||
    !selfieFile.type.startsWith("image/")
  ) {
    return {
      ok: false,
      message: "Please upload image files for both documents."
    };
  }

  // No automatic identity verification is performed.
  return {
    ok: true,
    message: "Your identity documents have been submitted."
  };
}