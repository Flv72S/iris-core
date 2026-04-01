import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const from = path.join(root, 'src', 'network', 'transport_grpc', 'transport_grpc_proto.proto');
const to = path.join(root, 'dist', 'network', 'transport_grpc', 'transport_grpc_proto.proto');
fs.mkdirSync(path.dirname(to), { recursive: true });
fs.copyFileSync(from, to);
