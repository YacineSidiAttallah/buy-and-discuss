// Règle de validation d'une adresse mail
const isEmail = email => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(emailRegEx)) return true;
  else return false;
};

//fonction qui permet de vérifier si une chaine est vide
const isEmpty = chaineDeCaractere => {
  if (chaineDeCaractere.trim() === "") return true;
  else return false;
};

exports.validateSignupData = data => {
  let errors = {};
  //validation des données (voir si le user n'existe pas déja dans la base) et que les champs sont valides et non vides
  if (isEmpty(data.email)) {
    errors.email = "L'adresse mail ne doit pas être vide";
  }
  //else si l'email n'est pas valide selon la règle de validation RegEx
  else if (!isEmail(data.email)) {
    errors.email = "L'adresse mail doit être valide";
  }
  if (isEmpty(data.password)) {
    errors.password = "Le mot de passe ne doit pas être vide";
  }
  if (data.confirmPassword !== data.password)
    errors.confirmPassword = "Les deux mots de passes ne sont pas identiques";
  if (isEmpty(data.handle)) {
    errors.handle = "Le mot de passe ne doit pas être vide";
  }

  //Vérifier si il n'y as pas des erreurs, et si c'est le cas, les retourner
  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

//
exports.validateLoginData = data => {
  let errors = {};
  if (isEmpty(data.email))
    errors.email = "L'adresse mail ne dois pas être vide";
  if (isEmpty(data.password))
    errors.password = "Le mot de passe ne dois pas être vide";

  //Vérifier si il n'y as pas des erreurs, et si c'est le cas, les retourner
  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

//Fonction permettant l'extraction des données utilisateur
//data ici représente request.body, ce qui représente toute les données utilisateur
exports.extractUserDetails = data => {
  let userDetails = {};
  /* Ces vérifications permettent de ne pas envoyer des chaines de caractères vides à la base de données 
    car même si l'utilisateur ne fournit pas de site, bio ou location, notre partie front-end en react enverra des chaines de caracteres vides,
    auquels cas on ne les stockera pas
    */
  if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
  if (!isEmpty(data.website.trim())) {
    //si le user a un site du type httpps://website.com, on l'enregistre comme ça
    //sinon, si il rentre seuelemnt www.website.com on a joute le http:// devant le lien.
    //(http et pas https au cas ce dernier ne possede pas de ssl, car celui ne s'ouvrira pas)
    if (data.website.trim().substring(0, 4) !== "http") {
      userDetails.website = `http://${data.website.trim()}`;
    } else userDetails.website = data.website;
  }
  if (!isEmpty(data.location.trim())) userDetails.location = data.location;
  return userDetails;
};
