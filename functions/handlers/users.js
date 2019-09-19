const {
    admin,
    db
} = require('../util/admin')

const config = require('../util/config')

const firebase = require('firebase')
firebase.initializeApp(config)

const {
    validateSignupData,
    validateLoginData,
    extractUserDetails
} = require('../util/validators')

//Route d'inscription
exports.signup = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };
    //Destructuration du validateSignupData en récuperant les deux valeurs, valid et erros
    const {
        valid,
        errors
    } = validateSignupData(newUser)

    if (!valid) return res.status(400).json(errors)

    const noImg = 'no-img.png'

    //handle est la variable contenant les informations du user qu'il faut vérifier ( email / id / name etc...)
    let token, userId;
    db.doc(`/users/${newUser.handle}`)
        .get()
        .then(doc => {
            if (doc.exists) {
                return res.status(400).json({
                    handle: "Cet utilisateur existe déja"
                });
            } else {
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then(data => {
            //if user is created, return access token pour pouvoir accéder à des routes "Protégées"
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then(idToken => {
            //On récupère le token et on l'ajoute à l'objet stocké dans la base de donnée , Le Document (ou la ligne) de chaque user.
            token = idToken;
            //Création de l'objet contenant les informations user
            const userInformations = {
                handle: newUser.handle,
                email: newUser.email,
                dateDeCréation: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
                userId
            };

            return db.doc(`/users/${newUser.handle}`).set(userInformations);
        })
        .then(() => {
            return res.status(201).json({
                token
            });
        })
        .catch(err => {
            console.error(err);
            //Vérification qu'il s'agit bien d'une erreur d'authentification
            if (err.code === "auth/email-already-in-use") {
                return res.status(400).json({
                    email: "Adresse mail déja utilisée"
                });
            }
            return res.status(500).json({
                error: err.code
            });
        });
};

//Route de conennxion
exports.login = (req, res) => {

    const user = {
        email: req.body.email,
        password: req.body.password
    };

    const {
        valid,
        errors
    } = validateLoginData(user)

    if (!valid) return res.status(400).json(errors)

    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        })
        .then(token => {
            return res.json({
                token
            });
        })
        .catch(err => {
            console.error(err);
            if (err.code === "auth/wrong-password") {
                //Erreur D'autentifciation: 403 code signifie unauthorized
                return res.status(403).json({
                    general: "Adresse mail ou mot de passe incorrect, veuillez rééssayez"
                });
                //Si c'est une autre erreur, on la retourne avec le code 500, qui indique un code d'erreur du serveur
            } else return res.status(500).json({
                error: err.code
            });
        });
};

//ajouter des détails utilisateur
exports.ajouterDetailsUtilisateur = (req, res) => {
    let detailsUtilisateur = extractUserDetails(req.body);
    db.doc(`/users/${req.user.handle}`).update(detailsUtilisateur)
        .then(() => {
            return res.json({
                message: 'Détails ajoutés avec succées'
            })
        })
        .catch((err) => {
            console.error(err)
            return res.status(500).json({
                err: err.code
            })
        })
}

//Récupération des données utilisateur pour notre partie front, gestion d'états via redux
exports.getAuthenticatedUser = (req, res) => {
    let userData = {}
    db.doc(`/users/${req.user.handle}`).get()
        .then(doc => {
            if (doc.exists) {
                userData.credentials = doc.data();
                return db.collection('likes').where('userHandle', '==', req.user.handle).get()
            }
        })
        .then(data => {
            userData.likes = []
            data.forEach(doc => {
                userData.likes.push(doc.data())
            })
            return db.collection('notifications').where('receiver', '==', req.user.handle)
                .orderBy('createdAt', 'desc').limit(10).get()
        })
        .then(data => {
            userData.notifications = []
            data.forEach(doc => {
                userData.notifications.push({
                    receiver: doc.data().receiver,
                    sender: doc.data().sender,
                    createdAt: doc.data().createdAt,
                    publicationId: doc.data().publicationId,
                    type: doc.data().type,
                    read: doc.data().read,
                    notificationId: doc.id,
                })
            })
            return res.json(userData)
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({
                error: err.code
            })
        })
}
//Route d'upload d'une photo de profil
exports.uploadProfileImage = (req, res) => {

    const BusBoy = require('busboy')
    const path = require('path')
    const os = require('os')
    const fs = require('fs')

    let imageFileName;
    let imageToBeUploaded = {};

    const busboy = new BusBoy({
        headers: req.headers
    })

    //Procédure qui vient de l'admin SDK documentation de firebase
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        //Verification que l'utilisateur upload bien une image et pas un autre type de fichier
        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
            return res.status(400).json({
                error: 'Format de fichier incorrect, veuillez importer une image svp'
            })
        }

        //Extraction de l'extension, split la chaine de caractere avec le point
        const imageExtension = filename.split('.')[filename.split('.').length - 1] //accés au dernier élément de la chaine
        // exemple de nom de file 64535.png
        imageFileName = `${Math.round(Math.random() * 10000)}.${imageExtension}`
        const filepath = path.join(os.tmpdir(), imageFileName)
        imageToBeUploaded = {
            filepath,
            mimetype
        }
        //Une fois que l'objet a été créé, on utilise le filesystem pour crééer le fichier
        file.pipe(fs.createWriteStream(filepath))
    })

    busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToBeUploaded.filepath, {
                resumable: false,
                metadata: {
                    metadata: {
                        contentType: imageToBeUploaded.mimetype
                    }
                }
            })
            .then(() => {
                //Construire l'url de l'image pour l'ajouter au user
                // le alt=media à la fin permet de montrer l'image dans le navigateur et de ne pas le télécharger 
                const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
                //On peut accéder au user car cette route est protégée par le fbAuth, donc si on arrive ici, c'est que le user est identifié
                return db.doc(`/users/${req.user.handle}`).update({
                        imageUrl
                    })
                    .then(() => {
                        return res.json({
                            message: 'Image chargée avec succées'
                        })
                    })
                    .catch(err => {
                        console.error(err)
                        return res.status(500).json({
                            err: err.code
                        })
                    })
            })
    })
    busboy.end(req.rawBody);
}

// Get les informations de n'importe quel utilisateur
exports.getUserDetails = (req, res) => {
    let userData = {}
    db.doc(`/users/${req.params.handle}`)
        .get()
        .then(doc => {
            if (doc.exists) {
                userData.user = doc.data()
                return db.collection('publications')
                    .where('userPublication', '==', req.params.handle)
                    .orderBy('dateDePublication', 'desc')
                    .get()
            } else {
                return res.status(404).json({
                    err: 'Uilisateur est introuvable'
                })
            }
        })
        .then(data => {
            userData.publications = []
            data.forEach(doc => {
                userData.publications.push({
                    body: doc.data().body,
                    dateDePublication: doc.data().dateDePublication,
                    userPublication: doc.data().userPublication,
                    userImage: doc.data().body,
                    nbCommentaires: doc.data().nbCommentaires,
                    nbLikes: doc.data().nbLikes,
                    nbDislikes: doc.data().body,
                    publicationId: doc.id
                })
            })
            return res.json(userData)
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({
                err: err.code
            })
        })
}
exports.marquerNotificationsEnRouge = (req, res) => {
    //update plisuers document avec la onction batch
    let batch = db.batch()
    req.body.forEach(notificationId => {
        const notification = db.doc(`/notifications/${notificationId}`)
        batch.update(notification, {
            read: true
        })
    })
    batch.commit()
        .then(() => {
            return res.json({
                message: "Notifications marquées en rouge"
            })
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({
                error: err.code
            })
        })
}