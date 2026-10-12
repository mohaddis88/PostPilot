// Compatibility re-export from API mock fixtures.
// UI and domain logic should never import this file directly; use the API layer (/src/api) instead.
export {
  INITIAL_PROFILES as PROFILES,
  INITIAL_ACCOUNTS as MOCK_ACCOUNTS_DATA,
  INITIAL_DRIVE_FILES as MOCK_DRIVE_FILES,
  INITIAL_POSTS as MOCK_POSTS_DATA,
} from '../api/mock/fixtures';
