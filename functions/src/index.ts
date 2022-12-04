import * as functions from "firebase-functions";
import { UserRegister } from "./user/userRegister";
import * as admin from "firebase-admin";
import * as express from "express";
import { Authentication } from "./user/authentication";
import { UserRecord } from "firebase-admin/lib/auth/user-record";
import { UserDocument } from "./user/userDocument";
const app = express();
app.use(express.json());

admin.initializeApp();

exports.userCreated = functions.auth.user().onCreate(async (user) => {
  let userMgmt = new UserDocument();
  return userMgmt
    .getProfileDoc(user.email)
    .then((profileDoc) => userMgmt.updateProfileDoc(profileDoc, user.uid))
    .then((profileDoc) => userMgmt.createUserRecord(profileDoc));
});

exports.setClaims = functions.firestore
  .document("/users/{documentId}")
  .onUpdate((snap, context) =>
    new Authentication().setClaims({ userRecord: snap.after.data() })
  );

app.post("/createUser", (request: any, response: any) => {
  new Authentication()
    .isHR(request.headers.authorization?.split("Bearer ")[1])
    .then(() => new UserRegister().parseRequest(request.body))
    .then((email: string) => new UserRegister().registerUser({ email }))
    .then((userRecord: { user: void | UserRecord; password: string }) => {
      response.status(200).send({
        uid: userRecord.user?.uid,
        password: userRecord.password,
      });
    })
    .catch((error) => {
      functions.logger.log("Error: ", error);
      response.status(404).send();
    });
});

// Expose Express API as a single Cloud Function:
exports.widgets = functions.https.onRequest(app);
