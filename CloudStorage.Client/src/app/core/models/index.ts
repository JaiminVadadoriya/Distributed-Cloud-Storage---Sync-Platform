/**
 * Barrel file: re-exports all model interfaces from their cohesive domain modules.
 * This ensures backward compatibility — existing `import { ... } from '../models/file.model'`
 * imports continue to work, but new imports can target specific modules.
 */
export * from './file.model';
export * from './folder.model';
export * from './dashboard.model';
export * from './trash.model';
export * from './sync.model';
export * from './notification.model';
export * from './device.model';
export * from './search.model';
export * from './audit.model';
export * from './api-response.model';
export * from './upload.model';
