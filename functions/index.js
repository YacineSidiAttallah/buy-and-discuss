const functions = require("firebase-functions");

const app = require("express")();
const FBAuth = require('./util/fbAuth')

const {
  db
} = require('./util/admin')

const {
  getAllPublications,
  publierUnePublication,
  getPublication,
  commentaireSurUnePublication,
  likeUnePublication,
  retirerlikeUnePublication,
  dislikeUnePublication,
  retirerDislikeUnePublication,
  deletePublication,
} = require('./handlers/publications')

const {
  signup,
  login,
  uploadProfileImage,
  ajouterDetailsUtilisateur,
  getAuthenticatedUser,
  getUserDetails,
  marquerNotificationsEnRouge,
} = require('./handlers/users')

/*----------------Publications--------------------*/
app.get('/publications', getAllPublications)
app.post('/publication', FBAuth, publierUnePublication)
app.get('/publication/:publicationId', getPublication)
app.post('/publication/:publicationId/commentaire', FBAuth, commentaireSurUnePublication)
//liker et unliker une publication (enlever son like)
app.get('/publication/:publicationId/like', FBAuth, likeUnePublication)
app.get('/publication/:publicationId/unlike', FBAuth, retirerlikeUnePublication)

//disliker et undislker une publication (enlever son dislike)
app.get('/publication/:publicationId/dislike', FBAuth, dislikeUnePublication)
app.get('/publication/:publicationId/undislike', FBAuth, retirerDislikeUnePublication)

//Supprimer une publication
app.delete('/publication/:publicationId', FBAuth, deletePublication);

/*----------------Authentication Process--------------------*/
app.post('/signup', signup)
app.post("/login", login)

/*----------------User actions--------------------*/
app.post('/user/image', FBAuth, uploadProfileImage)
app.post('/user', FBAuth, ajouterDetailsUtilisateur)
app.get('/user', FBAuth, getAuthenticatedUser)
app.get('/user/:handle', getUserDetails)
app.post('/notifications', FBAuth, marquerNotificationsEnRouge)

//Express permet de passer en argument un second arguement qui sera une fonction
//ici elle (FBAuth) servira à proteger la route de publication, afin de s'assurer le user est bien connecté (middlware)
//https://baseurel.com/api/publications/ ou api.baseurl.com => mieux que https://baseurel.com/publications/
//app is the container of all the routes on the app
exports.api = functions.https.onRequest(app);

/*----------------Notifications--------------------*/
//Notification lors d'un like
exports.createNotificationOnLike = functions
  .region('us-central1')
  .firestore
  .document('likes/{id}')
  .onCreate((snapshot) => {
    return db.doc(`/publications/${snapshot.data().publicationId}`)
      .get()
      .then(doc => {
        if (doc.exists) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            receiver: doc.data().userPublication,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            publicatinId: doc.id
          })
        }
      })
      .then(() => {
        return
      })
      //ceci est un trigger bdd et pas un endpoint sur l'api, 
      //donc on est pas obligé d'envoyer de réponses à partir de la base()
      .catch(err => {
        console.error(err);
        return;
      })
  })

exports.createNotificationOnDislike = functions
  .region('us-central1')
  .firestore
  .document('dislikes/{id}')
  .onCreate((snapshot) => {
    return db.doc(`/publications/${snapshot.data().publicationId}`)
      .get()
      .then(doc => {
        if (doc.exists) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            receiver: doc.data().userPublication,
            sender: snapshot.data().userHandle,
            type: 'dislike',
            read: false,
            publicatinId: doc.id
          })
        }
      })
      .then(() => {
        return;
      })
      //Ceci est un trigger bdd et pas un endpoint sur l'api, 
      //donc on est pas obligé d'envoyer de réponses à partir de la base()
      .catch(err => {
        console.error(err);
        return;
      })
  })

//Notification lors d'un commentaire 
exports.createNotificationOnComment = functions
  .region('us-central1')
  .firestore
  .document('commentaires/{id}')
  .onCreate((snapshot) => {
    return db.doc(`/publications/${snapshot.data().publicationId}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            receiver: doc.data().userPublication,
            sender: snapshot.data().userHandle,
            type: 'commentaire',
            read: false,
            publicatinId: doc.id
          })
        }
      })
      .then(() => {
        return;
      })
      //ceci est un trigger bdd et pas un endpoint sur l'api, 
      //donc on est pas obligé d'envoyer de réponses à partir de la base()
      .catch(err => {
        console.error(err);
        return;
      })
  })

// Suppression de la notification quand quelq'un enlève son like
exports.deleteNotificationOnUnLike = functions
  .region('us-central1')
  .firestore.document('likes/{id}')
  .onDelete((snapshot) => {
    return db.doc(`/notifications/${snapshot.id}`)
      .delete()
      .then(() => {
        return;
      })
      .catch(err => {
        console.error(err)
        return;
      })
  })

// Suppression de la notification quand quelq'un enlève son dislike
exports.deleteNotificationOnUnDisLike = functions
  .region('us-central1')
  .firestore.document('dislikes/{id}')
  .onDelete((snapshot) => {
    return db.doc(`/notifications/${snapshot.id}`)
      .delete()
      .then(() => {
        return
      })
      .catch(err => {
        console.error(err)
        return
      })
  })