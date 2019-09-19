const {
  db
} = require("../util/admin");

exports.getAllPublications = (req, res) => {
  db.collection("publications")
    //La prochaine fonction permet de réordner les publications et ainsi d'avoir à chaque fois la dernière en top du fichier json
    .orderBy("dateDePublication", "desc")
    .get()
    .then(data => {
      let publications = [];
      data.forEach(doc => {
        //Au lieu de push tout le contenu de la publication, on va push un object contenant des champs spécifiques
        publications.push({
          publicationId: doc.id,
          body: doc.data().body,
          userPublication: doc.data().userPublication,
          dateDePublication: doc.data().dateDePublication
        });
      });
      return res.json(publications);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        err: err.code
      });
    });
};

exports.publierUnePublication = (req, res) => {
  //Vérification que la publication n'est pas vide.
  if (req.body.body.trim() === "") {
    return res.status(400).json({
      body: "Le corp de la pulication ne doit pas être vide"
    });
  }

  const newPublication = {
    body: req.body.body,
    //Mnt que le user est connécté, on peut le récuperer depuis la requete
    userPublication: req.user.handle,
    userImage: req.user.imageUrl,
    //produitCategorie: "",
    //urlProduit: req.productUrl,
    //imageProdui: req.user.imageProdui,
    nbCommentaires: 0,
    nbLikes: 0,
    nbDisLikes: 0,
    //admin.firestore.Timestamp.fromDate(new Date()), la méthode qu'on utilisais avant ne formate pas la date automatiquemnt
    //on utilisera donc la méthode ci-dessous
    dateDePublication: new Date().toISOString(),
  };

  db.collection("publications")
    .add(newPublication)
    .then(doc => {
      const responsePublication = newPublication;
      responsePublication.publicationId = doc.id;
      res.json(responsePublication);
    })
    // Si il ya une erreur, on change le status code qui est 200 si il n'ya pas d'erreurs, on le remplace par 500 qui est un code d'erreur
    // du serveur
    .catch(err => {
      res.status(500).json({
        error: "Une erreur est survenue"
      });
      console.error(err);
    });
};

//Récupération d'une publication et de ses commentaires
exports.getPublication = (req, res) => {
  publicationData = {};
  db.doc(`/publications/${req.params.publicationId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({
          error: "Aucune pulication trouvée"
        });
      }
      publicationData = doc.data();
      publicationData.publicationId = doc.id;
      return db
        .collection("commentaires")
        .orderBy("dateDeCreation", "desc")
        .where("publicationId", "==", req.params.publicationId)
        .get();
    })
    .then(data => {
      publicationData.commentaires = [];
      data.forEach(doc => {
        publicationData.commentaires.push(doc.data());
      });
      return res.json(publicationData);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        error: err.code
      });
    });
};

//commentaire sur une publication
exports.commentaireSurUnePublication = (req, res) => {
  if (req.body.body.trim() === "")
    return res.status(400).json({
      error: "Ne doit pas être vide"
    });

  const newCommentaire = {
    body: req.body.body,
    dateDeCreation: new Date().toISOString(),
    publicationId: req.params.publicationId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl
  };
  db.doc(`/publications/${req.params.publicationId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(400).json({
          error: "Publication introuvable !"
        });
      }
      //update le nombre de commentaires
      return doc.ref.update({
        nbCommentaires: doc.data().nbCommentaires + 1
      })
    })
    .then(() => {
      return db.collection('commentaires').add(newCommentaire)
    })
    .then(() => {
      res.json(newCommentaire);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        error: "Une erreur est survenue"
      });
    });
};

//liker une publication
exports.likeUnePublication = (req, res) => {
  const likeDocument = db
    .collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('publicationId', '==', req.params.publicationId)
    .limit(1);

  const publicationDocument = db.doc(`/publications/${req.params.publicationId}`);

  let publicationData;

  publicationDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        publicationData = doc.data();
        publicationData.publicationId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({
          error: 'Aucune publication trouvée'
        });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection('likes')
          .add({
            publicationId: req.params.publicationId,
            userHandle: req.user.handle
          })
          .then(() => {
            publicationData.nbLikes++;
            return publicationDocument.update({
              nbLikes: publicationData.nbLikes
            });
          })
          .then(() => {
            return res.json(publicationData);
          });
      } else {
        return res.status(400).json({
          error: 'Publication déja likée'
        });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({
        error: err.code
      });
    });
};

//Retirer sa réaction de like sur une publication
// ce code aurait très bien pu petre dans la fonction de like précedente, mais ça aurait fait trop de code, difficile à relire
exports.retirerlikeUnePublication = (req, res) => {
  const likeDocument = db
    .collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('publicationId', '==', req.params.publicationId)
    .limit(1);

  const publicationDocument = db.doc(`/publications/${req.params.publicationId}`);

  let publicationData;

  publicationDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        publicationData = doc.data();
        publicationData.publicationId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({
          error: 'publication not found'
        });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({
          error: 'Publication pas encore likée'
        });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            publicationData.nbLikes--;
            return publicationDocument.update({
              nbLikes: publicationData.nbLikes
            });
          })
          .then(() => {
            res.json(publicationData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({
        error: err.code
      });
    });
};

//liker une publication
exports.dislikeUnePublication = (req, res) => {
  const dislikeDocument = db
    .collection('dislikes')
    .where('userHandle', '==', req.user.handle)
    .where('publicationId', '==', req.params.publicationId)
    .limit(1);

  const publicationDocument = db.doc(`/publications/${req.params.publicationId}`);

  let publicationData;

  publicationDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        publicationData = doc.data();
        publicationData.publicationId = doc.id;
        return dislikeDocument.get();
      } else {
        return res.status(404).json({
          error: 'Aucune publication trouvée'
        });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection('dislikes')
          .add({
            publicationId: req.params.publicationId,
            userHandle: req.user.handle
          })
          .then(() => {
            publicationData.nbDisLikes++;
            return publicationDocument.update({
              nbDisLikes: publicationData.nbDisLikes
            });
          })
          .then(() => {
            return res.json(publicationData);
          });
      } else {
        return res.status(400).json({
          error: 'Publication déja dislikée'
        });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({
        error: err.code
      });
    });
};

//Retirer sa réaction de disike sur une publication
exports.retirerDislikeUnePublication = (req, res) => {
  const dislikeDocument = db
    .collection('dislikes')
    .where('userHandle', '==', req.user.handle)
    .where('publicationId', '==', req.params.publicationId)
    .limit(1);

  const publicationDocument = db.doc(`/publications/${req.params.publicationId}`);

  let publicationData;

  publicationDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        publicationData = doc.data();
        publicationData.publicationId = doc.id;
        return dislikeDocument.get();
      } else {
        return res.status(404).json({
          error: 'publication not found'
        });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({
          error: 'Publication pas encore likée'
        });
      } else {
        return db
          .doc(`/dislikes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            publicationData.nbDisLikes--;
            return publicationDocument.update({
              nbDisLikes: publicationData.nbDisLikes
            });
          })
          .then(() => {
            res.json(publicationData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({
        error: err.code
      });
    });
};

//Suppression d'une publciation
exports.deletePublication = (req, res) => {
  const document = db.doc(`/publications/${req.params.publicationId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({
          error: 'Aucune publication trouvée'
        });
      }
      if (doc.data().userPublication !== req.user.handle) {
        return res.status(403).json({
          error: 'Non Authorisée'
        });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({
        message: 'Publication supprimée avec succées'
      });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({
        error: err.code
      });
    });
};