// Ceci est un fichier qui représente le schéma de la base de donnée, il n'intervient pas dans le code source de l'app.
let db = {
    users: [{
        userId: 'ghghghghg',
        email: "user@email.com ",
        handle: "user",
        createdAt: "...",
        imageUrl: "....",
        bio: "...",
        website: "...",
        location: "...",
    }],
    publications: [{
        //l'ID n'eiste pas dans la db, ce dernier est retourné via le code de l'app (express)
        userPublication: 'user',
        body: 'Corp de la publication',
        dateDePublication: '2019-08-27T06:13:20.431Z',
        //Pour les likes et les commentaires, on aurait pu créer une ligne à part dans la DB, et identifier les commentaires 
        //( ou likes ) ayant les même identifiants que la publication, et ensuite les compter
        //Mais Firebase facture à la lecture de la donnée, il est donc mieux d'en faire le moins possible.
        nbLikes: 5,
        nbComments: 2,
    }],
    commentaires: [{
        userHandle: 'user',
        publicationId: 'kdjsfgdksuufhgkdsufky',
        body: 'nice one mate!',
        createdAt: '2019-03-15T10:59:52.798Z'
    }],
    notifications: [{
        receiver: 'user',
        sender: 'mike',
        read: 'true | false',
        publicationId: 'sdHHDzdazdhFSdzF',
        type: 'like | comment | dislike',
        createdAt: '2019-09-09T17:37:51.012Z',

    }]
}

const userDetails = {
    //Données qui serviront à la gestion d'états avec Redux.
    credentials: {
        userId: 'N43KJ5H43KJHREW4J5H3JWMERHB',
        email: 'user@email.com',
        handle: 'user',
        createdAt: '2019-03-15T10:59:52.798Z',
        imageUrl: 'image/dsfsdkfghskdfgs/dgfdhfgdh',
        bio: 'Hello, my name is user, nice to meet you',
        website: 'https://user.com',
        location: 'Lonodn, UK'
    },
    likes: [{
            userHandle: 'user',
            screamId: 'hh7O5oWfWucVzGbHH2pa'
        },
        {
            userHandle: 'user',
            screamId: '3IOnFoQexRcofs5OhBXO'
        }
    ]
}