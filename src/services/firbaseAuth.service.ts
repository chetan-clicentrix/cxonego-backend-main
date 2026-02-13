import * as admin from "firebase-admin";
// import {join} from "path";
// const firbaseKeyJson = join(__dirname, "../../cxonegoFirebase.json");
// const accessKey = require(firbaseKeyJson);
import * as dotenv from "dotenv";
dotenv.config();

const accessKey = {
  type: "service_account",
  project_id: process.env.PROJECT_ID,
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: process.env.AUTH_URI,
  token_uri: process.env.TOKEN_URI,
  auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_x509_CERT_URL,
  client_x509_cert_url: process.env.CLIENT_x509_CERT_URL,
  universe_domain: process.env.UNIVERSE_DOMAIN
};

let app: admin.app.App;

if (admin.apps.length === 0) {
  app = admin.initializeApp({
    credential: admin.credential.cert(accessKey as admin.ServiceAccount),
  });
} else {
  app = admin.app();
}

const verifier = app.auth();

export default verifier;