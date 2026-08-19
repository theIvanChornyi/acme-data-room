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
    prepareActionFailed: 'Unable to prepare this action.',
    moveFileFailed: 'Unable to move file.',
    moveFileToRoomFailed: 'Unable to move file to this Data Room.',
    invalidFiles: 'Drop PDF files only; each file must be 25 MB or smaller.',
  },
  sharing: {
    invalidAccess: 'This shared access is invalid.',
    unavailable: 'This shared access is unavailable.',
    openDocumentFailed: 'Unable to open this document.',
    downloadDocumentFailed: 'Unable to download this document.',
    loadSettingsFailed: 'Unable to load sharing settings.',
    createLinkFailed: 'Unable to create a public link.',
    grantAccessFailed: 'Unable to grant access.',
    copyLinkFailed: 'Unable to copy the link. Select it manually and copy it.',
    revokeLinkFailed: 'Unable to revoke this link.',
    revokeAccessFailed: 'Unable to revoke this access.',
  },
  dialogs: {
    nameRequired: 'Enter a name.',
    renameFailed: 'Unable to rename item.',
    moveFailed: 'Unable to move file.',
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
