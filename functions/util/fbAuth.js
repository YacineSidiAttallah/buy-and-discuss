const {
    admin,
    db
} = require('./admin')

module.exports = (req, res, next) => {
    let idToken;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Membre ")
    ) {
        //Récuperation du token
        idToken = req.headers.authorization.split("Membre ")[1];
    } else {
        console.error("Aucun token trouvé");
        return res.status(403).json({
            error: "Utilisateur non autorisé"
        });
    }
    admin
        .auth()
        .verifyIdToken(idToken)
        .then(decodedToken => {
            console.log(decodedToken);
            //Ajoutt des données provenants du token à l'objet request, afin que ce dernier contienne des informations en plus
            //du user provenant de ce token
            //en plus des des informations de connexions.
            req.user = decodedToken;
            return db
                .collection("users")
                .where("userId", "==", req.user.uid)
                //Limiter le résutlat à un document
                .limit(1)
                .get()
        })
        //la fonction limit(1) permet d'importer un seul document, parcontre ce dernier est un array, on doit donc y acceder
        //et récuperer le premier élement
        .then(data => {
            req.user.handle = data.docs[0].data().handle;
            req.user.imageUrl = data.docs[0].data().imageUrl
            //la fonction next permet au request de s'executer
            return next();
        })
        .catch(err => {
            console.error("Erreur pendant la vérification du token", err);
            return res.status(403).json(err);
        });
};