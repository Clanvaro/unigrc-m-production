import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// ============================================================================
// Environment Detection and Storage Client Initialization
// ============================================================================
// Supports both GCP (Cloud Run with service account) and Replit (sidecar auth)
// ============================================================================

/**
 * Detects the deployment environment
 * @returns 'gcp' | 'replit' | 'unknown'
 */
function detectEnvironment(): 'gcp' | 'replit' | 'unknown' {
  // Check for GCP-specific environment variables
  const isGCP =
    process.env.IS_GCP_DEPLOYMENT === 'true' ||
    process.env.K_SERVICE !== undefined || // Cloud Run sets this
    process.env.GOOGLE_CLOUD_PROJECT !== undefined ||
    (process.env.GCS_PROJECT_ID && process.env.GCS_BUCKET_NAME);

  // Check for Replit-specific environment variables
  const isReplit =
    process.env.REPL_ID !== undefined ||
    process.env.REPL_SLUG !== undefined ||
    process.env.REPLIT_DB_URL !== undefined;

  if (isGCP) return 'gcp';
  if (isReplit) return 'replit';
  return 'unknown';
}

/**
 * Initialize Google Cloud Storage client based on environment
 */
function initializeStorageClient(): Storage | null {
  const environment = detectEnvironment();

  console.log(`🗄️  [Storage] Detected environment: ${environment}`);

  // GCP Deployment: Use service account credentials
  if (environment === 'gcp') {
    const projectId = process.env.GCS_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    const clientEmail = process.env.GCS_CLIENT_EMAIL;
    const privateKey = process.env.GCS_PRIVATE_KEY;

    // Check if credentials are provided
    if (!projectId || !clientEmail || !privateKey) {
      console.warn('⚠️  [Storage] GCP environment detected but credentials not fully configured');
      console.warn('   Missing:', {
        projectId: !projectId,
        clientEmail: !clientEmail,
        privateKey: !privateKey
      });
      console.warn('   Cloud Storage features will be disabled');
      return null;
    }

    try {
      // Initialize with service account credentials
      const storage = new Storage({
        projectId,
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
        },
      });

      console.log(`✅ [Storage] GCP Cloud Storage initialized for project: ${projectId}`);
      return storage;
    } catch (error) {
      console.error('❌ [Storage] Failed to initialize GCP Cloud Storage:', error);
      return null;
    }
  }

  // Replit Deployment: Use sidecar authentication
  if (environment === 'replit') {
    try {
      const storage = new Storage({
        credentials: {
          audience: "replit",
          subject_token_type: "access_token",
          token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
          type: "external_account",
          credential_source: {
            url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
            format: {
              type: "json",
              subject_token_field_name: "access_token",
            },
          },
          universe_domain: "googleapis.com",
        },
        projectId: "",
      });

      console.log('✅ [Storage] Replit Object Storage initialized');
      return storage;
    } catch (error) {
      console.error('❌ [Storage] Failed to initialize Replit Object Storage:', error);
      return null;
    }
  }

  // Unknown environment
  console.warn('⚠️  [Storage] Unknown deployment environment - Cloud Storage features disabled');
  console.warn('   Set IS_GCP_DEPLOYMENT=true or ensure Replit environment variables are present');
  return null;
}

// Initialize the storage client
export const objectStorageClient = initializeStorageClient();

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  constructor() { }

  // Gets the public object search paths.
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
        "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
        "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  // Search for a public object from the search paths.
  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      // Full path format: /<bucket_name>/<object_name>
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      // Check if file exists
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  // Downloads an object to the response.
  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      // Get file metadata
      const [metadata] = await file.getMetadata();
      // Get the ACL policy for the object.
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      // Set appropriate headers
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${isPublic ? "public" : "private"
          }, max-age=${cacheTtlSec}`,
      });

      // Stream the file to the response
      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
        "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    // Sign URL for PUT method with TTL
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  // Uploads an object from buffer and returns storage details
  async uploadObjectFromBuffer(
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ objectPath: string; storageUrl: string }> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
        "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    // Get signed URL for upload
    const uploadUrl = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });

    // Upload the buffer to the signed URL
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: buffer,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": buffer.length.toString(),
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    // Return the object path and storage URL
    const objectPath = `/objects${fullPath}`;
    const storageUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;

    return {
      objectPath,
      storageUrl,
    };
  }

  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<File> {

    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    // Extract the path after "/objects/" and clean up any double slashes or invalid prefixes
    let fullObjectPath = objectPath.slice(9); // Remove "/objects/"

    // Handle repeated "/objects/" prefixes (common malformed path issue)
    while (fullObjectPath.startsWith("/objects/")) {
      fullObjectPath = fullObjectPath.slice(9); // Remove redundant "/objects/"
    }

    // Clean up multiple consecutive slashes
    fullObjectPath = fullObjectPath.replace(/\/+/g, '/');

    // Ensure path starts with / for parseObjectPath function
    if (!fullObjectPath.startsWith("/")) {
      fullObjectPath = `/${fullObjectPath}`;
    }

    // Debug logging for troubleshooting
    console.log(`🔍 Object path parsing: original="${objectPath}" -> cleaned="${fullObjectPath}"`);

    try {
      // Parse to get bucket and object name directly from the full path
      const { bucketName, objectName } = parseObjectPath(fullObjectPath);

      if (!bucketName || bucketName.trim() === '') {
        throw new Error(`Empty bucket name extracted from path: ${fullObjectPath}`);
      }

      if (!objectName || objectName.trim() === '') {
        throw new Error(`Empty object name extracted from path: ${fullObjectPath}`);
      }

      console.log(`🗄️ Accessing storage: bucket="${bucketName}", object="${objectName}"`);

      const bucket = objectStorageClient.bucket(bucketName);
      const objectFile = bucket.file(objectName);

      // Check if file exists
      const [exists] = await objectFile.exists();
      if (!exists) {
        console.error(`Object not found: bucket=${bucketName}, object=${objectName}, full path=${objectPath}`);
        throw new ObjectNotFoundError();
      }
      return objectFile;
    } catch (parseError) {
      console.error(`❌ Path parsing failed for "${objectPath}":`, parseError);
      console.error(`❌ Cleaned path was: "${fullObjectPath}"`);
      throw new ObjectNotFoundError();
    }
  }

  normalizeObjectEntityPath(
    rawPath: string,
  ): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    // Extract the path from the URL by removing query parameters and domain
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    // Extract the entity ID from the path, but preserve the bucket information
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    // Keep the full path from the private directory onwards to preserve bucket info
    const bucketName = objectEntityDir.split('/')[1]; // Extract bucket name from objectEntityDir
    return `/objects/${bucketName}/.private/${entityId}`;
  }

  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const environment = detectEnvironment();

  // GCP Deployment: Use service account to generate signed URL
  if (environment === 'gcp') {
    if (!objectStorageClient) {
      throw new Error('Cloud Storage client not initialized. Check GCS credentials.');
    }

    try {
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      // Generate signed URL using service account
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: method === 'GET' ? 'read' : method === 'PUT' ? 'write' : method === 'DELETE' ? 'delete' : 'read',
        expires: Date.now() + ttlSec * 1000,
      });

      return signedUrl;
    } catch (error) {
      console.error('❌ [Storage] Failed to generate GCP signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error}`);
    }
  }

  // Replit Deployment: Use sidecar endpoint
  if (environment === 'replit') {
    const request = {
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    };

    try {
      const response = await fetch(
        `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to sign object URL, errorcode: ${response.status}, ` +
          `make sure you're running on Replit`
        );
      }

      const { signed_url: signedURL } = await response.json();
      return signedURL;
    } catch (error) {
      console.error('❌ [Storage] Failed to generate Replit signed URL:', error);
      throw error;
    }
  }

  // Unknown environment
  throw new Error(
    'Cannot generate signed URL: Unknown deployment environment. ' +
    'Set IS_GCP_DEPLOYMENT=true or ensure Replit environment variables are present.'
  );
}

// Health check function for Object Storage
export async function checkObjectStorageHealth(): Promise<boolean> {
  try {
    // Try to access the sidecar endpoint
    const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/credential`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.error('❌ Object Storage health check failed: sidecar not accessible');
      return false;
    }

    // Check if we have environment variables set
    const hasPublicPaths = !!process.env.PUBLIC_OBJECT_SEARCH_PATHS;
    const hasPrivateDir = !!process.env.PRIVATE_OBJECT_DIR;

    if (!hasPublicPaths || !hasPrivateDir) {
      console.warn('⚠️ Object Storage partially configured (missing env vars)');
      return true; // Still healthy, just not fully configured
    }

    return true;
  } catch (error) {
    console.error('❌ Object Storage health check failed:', error);
    return false;
  }
}