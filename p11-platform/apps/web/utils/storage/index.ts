/**
 * Storage utilities for the P11 Platform
 * 
 * Usage:
 * import { uploadBase64Asset, STORAGE_BUCKETS } from '@/utils/storage'
 */

export {
  // Bucket constants
  STORAGE_BUCKETS,
  
  // Types
  type StorageBucket,
  type AssetType,
  type UploadOptions,
  type UploadResult,
  type AssetMetadata,
  
  // Upload functions
  uploadBase64Asset,
  uploadFileAsset,
  uploadBufferAsset,
  uploadFromDataUrl,
  uploadAndSaveGeneratedAsset,
  
  // Utility functions
  parseDataUrl,
  deleteAsset,
  listAssets,
  saveAssetMetadata,
  getExtensionFromMimeType,
  getMimeTypeFromExtension,
  getAssetTypeFromMime,
  generateFilename,
  buildStoragePath,
} from './asset-service'








