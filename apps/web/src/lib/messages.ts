/** User-facing feedback shared by the web client. */
export const WebMessages = {
  api: {
    requestFailed: 'Something went wrong. Please try again.',
    sharedLinkUnavailable: 'This shared link is unavailable.',
    uploadInterrupted: 'Upload interrupted. Check your connection and try again.',
    unableToUploadToStorage: 'Unable to upload the file to private storage.',
    invalidPdf: 'Choose a valid PDF file.',
  },
  auth: {
    missingConfiguration: 'Add Supabase credentials to apps/web/.env before signing in.',
    emailRequired: 'Enter your email address.',
    passwordTooShort: 'Use a password with at least 8 characters.',
    passwordsDoNotMatch: 'Passwords do not match.',
    confirmEmail: 'Check your email to confirm your account, then sign in.',
    failed: 'Unable to authenticate. Please try again.',
  },
  workspace: {
    unavailable: 'Unable to load your workspace.',
    openFileFailed: 'Unable to open file.',
    downloadFileFailed: 'Unable to download file.',
    downloadSelectionFailed: 'Unable to download the selected items.',
    prepareActionFailed: 'Unable to prepare this action.',
    moveFileFailed: 'Unable to move file.',
    moveFileToRoomFailed: 'Unable to move file to this Data Room.',
    invalidFiles: 'Drop PDF files only; each file must be 25 MB or smaller.',
    uploadSelectionAdjusted: (invalidCount: number, overLimitCount: number) => {
      const details = [];
      if (invalidCount)
        details.push(
          `${invalidCount} file${invalidCount === 1 ? '' : 's'} must be a PDF no larger than 25 MB.`,
        );
      if (overLimitCount)
        details.push(
          `Only 10 files can be uploaded at once; ${overLimitCount} additional file${overLimitCount === 1 ? '' : 's'} were not added.`,
        );
      return details.join(' ');
    },
    deletionQueued: 'Deletion started. Large folders continue deleting in the background.',
    deletionCompleted: 'Deletion completed.',
    deletionContinues: 'Deletion is still in progress and will continue automatically.',
  },
  sharing: {
    invalidAccess: 'This shared access is invalid.',
    unavailable: 'This shared access is unavailable or may have been revoked by its owner.',
    openDocumentFailed: 'Unable to open this document.',
    downloadDocumentFailed: 'Unable to download this document.',
    loadSettingsFailed: 'Unable to load sharing settings.',
    createLinkFailed: 'Unable to create a public link.',
    grantAccessFailed: 'Unable to grant access.',
    copyLinkFailed: 'Unable to copy the link. Select it manually and copy it.',
    revokeLinkFailed: 'Unable to revoke this link.',
    revokeAccessFailed: 'Unable to revoke this access.',
  },
  navigation: {
    notFound: 'The page you requested does not exist or is no longer available.',
  },
  dialogs: {
    nameRequired: 'Enter a name.',
    renameFailed: 'Unable to rename item.',
    deleteFailed: 'Unable to delete item.',
    roomNameRequired: 'Enter a Data Room name.',
    saveRoomFailed: 'Unable to save Data Room.',
    deleteRoomFailed: 'Unable to delete Data Room.',
    folderNameRequired: 'Enter a folder name.',
    createFolderFailed: 'Unable to create folder.',
  },
  uploads: {
    invalidFiles: 'Upload PDF files only; each file must be 25 MB or smaller.',
    fileRequired: 'Choose at least one PDF.',
    uploadFailed: 'Unable to upload this file.',
    failedFiles: (count: number) =>
      `${count} file${count === 1 ? '' : 's'} could not be uploaded. You can retry them.`,
  },
} as const;

export function messageFrom(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}
