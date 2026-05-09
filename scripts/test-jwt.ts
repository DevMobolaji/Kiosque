import 'dotenv/config';
import { signToken, verifyToken, issueTokenPair } from '../src/common/utils/jwt';

console.log('Test 1: Sign and verify access token');
const token = signToken({ userId: 'test-uuid', type: 'access', role: 'CUSTOMER' });
console.log('  Signed:', token.substring(0, 50) + '...');

const decoded = verifyToken(token, 'access');
console.log('  Verified:', { sub: decoded.sub, type: decoded.type, role: decoded.role });

console.log('\nTest 2: Token pair');
const pair = issueTokenPair({ userId: 'user-123', sessionId: 'session-456', role: 'VENDOR' });
console.log('  Pair issued:', {
  accessLength: pair.accessToken.length,
  refreshLength: pair.refreshToken.length,
});

const refreshDecoded = verifyToken(pair.refreshToken, 'refresh');
console.log('  Refresh verified:', { sub: refreshDecoded.sub, sessionId: refreshDecoded.sessionId });

console.log('\nTest 3: Type guard rejects access token used as refresh');
try {
  verifyToken(pair.accessToken, 'refresh');
  console.error('  FAIL: access token was accepted as refresh');
  process.exit(1);
} catch (err) {
  console.log('  PASS: access token correctly rejected');
}

console.log('\nAll tests passed.');
