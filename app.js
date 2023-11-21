// require('dotenv').config()

// const express = require('express')
// const app = express()
// const path = require('path')
// const fetch = require('node-fetch');
// const port = process.env.PORT || 8004;

// const Prismic = require('@prismicio/client');
// const PrismicH = require('@prismicio/helpers');

// // const initApi = req => {
// //   return Prismic.getApi(process.env.PRISMIC_ENDPOINT, {
// //     accessToken: process.env.PRISMIC_ACCESS_TOKEN,
// //     req
// //   })
// // }

// const initApi = (req) => {
//   return Prismic.createClient(process.env.PRISMIC_ENDPOINT, {
//     accessToken: process.env.PRISMIC_ACCESS_TOKEN,
//     req,
//     fetch,
//   });
// };

// const handleLinkResolver = doc => {



//   return '/'
// }

// app.use((req, res, next) => {
//   res.locals.ctx = {
//     endpoint: process.env.PRISMIC_ENDPOINT,
//     linkResolver: handleLinkResolver,
//   }
//   //add PrismicDOM in locals to access them in templates
//   res.locals.PrismicH = PrismicH;
//   next()
// })

// app.set('views', path.join(__dirname, 'views'))
// app.set('view engine', 'pug')

// app.get('/', (req, res) => {
//   res.render('pages/home')
// })

// // app.get('/about', async (req, res) => {
// //   initApi(req).then(api => {
// //     api.query(
// //       Prismic.Predicates.at('document.type', 'about')
// //     ).then(response => {
// //       console.log(response);
// //       res.render('pages/about')
// //     })
// //   })
// // })

// app.get('/about', async (req, res) => {
//   try {
//     const api = await initApi(req);
//     const response = await api.query(
//       Prismic.Predicates.any('document.type', ['about', 'meta'])).then(response => {
//         const {results} = response
//         const [about, meta] = results

//         res.render('pages/about',{
//           about,
//           meta
//         });
//       })


//   } catch (error) {
//     console.error('Error in /about route:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });




// app.get('/collections', (req, res) => {
//   res.render('pages/collections')
// })

// app.get('/details/:uid', async (req, res) => {
//   console.log('REQUEST');

//   const api = await initApi(req);
//   const response = await api.query(
//     Prismic.Predicates.any('document.type', ['meta'])).then(response => {
//       const {results} = response
//       const [meta] = results

//       res.render('pages/details',{
//         meta
//       });
//     })
// })


// app.listen(port, () => {
//   console.log(`Example app listening on port ${port}`)
// })

require('dotenv').config();

const logger = require('morgan');
const express = require('express');
const errorHandler = require('errorhandler');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

const app = express();
const path = require('path');
const port = 8004;

if (module.hot) {
  module.hot.accept();
}

const Prismic = require('@prismicio/client');

// const { Logger } = require('sass');
// const PrismicH = require('@prismicio/helpers');

//Initialize Prismic.io api
const initApi = (req) => {
  return Prismic.createClient(process.env.PRISMIC_ENDPOINT, {
    accessToken: process.env.PRISMIC_ACCESS_TOKEN,
    req,
    fetch,
  });
};

//Link Resolver
const handleLinkResolver = (doc) => {
  if (doc.type === 'product') {
    return `/detail/${doc.slug}`;
  }

  if (doc.type === 'about') {
    return '/about';
  }

  if (doc.type === 'collections') {
    return '/collections';
  }
  // Define the url depending on the document type
  //   if (doc.type === 'page') {
  //     return '/page/' + doc.uid;
  //   } else if (doc.type === 'blog_post') {
  //     return '/blog/' + doc.uid;
  //   }
  return '/';
};

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride());
app.use(errorHandler());
app.use(express.static(path.join(__dirname, 'public')));

//Middleware to add prismic content
app.use((req, res, next) => {
  res.locals.ctx = {
    endpoint: process.env.PRISMIC_ENDPOINT,
    linkResolver: handleLinkResolver,
  };

  res.locals.Prismic = Prismic;
  res.locals.Link = handleLinkResolver;
  res.locals.Numbers = (index) => {
    return index === 0
      ? 'One'
      : index === 1
      ? 'Two'
      : index === 2
      ? 'Three'
      : index === 3
      ? 'Four'
      : '';
  };

  next();
});

//Handle API request
const handleRequest = async (api) => {
  const [meta, preloader, navigation, home, about, { results: collections }] =
    await Promise.all([
      api.getSingle('meta'),
      api.getSingle('preloader'),
      api.getSingle('navigation'),
      api.getSingle('home'),
      api.getSingle('about'),
      api.get({
        filters: [Prismic.filter.at('document.type', 'collection')],
        fetchLinks: 'product.image',
      }),
    ]);

  //   console.log(about, home, collections);

  const assets = [];

  //   home.data.gallery.forEach((item) => {
  //     assets.push(item.image.url);
  //   });

  about.data.gallery.forEach((item) => {
    assets.push(item.image.url);
  });

  about.data.body.forEach((section) => {
    if (section.slice_type === 'gallery') {
      section.items.forEach((item) => {
        assets.push(item.image.url);
      });
    }
  });

  //   collections.forEach((collection) => {
  //     collection.data.list.forEach((item) => {
  //       assets.push(item.product.data.image.url);
  //     });
  //   });

  // console.log(collections);

  return {
    assets,
    meta,
    home,
    collections,
    about,
    navigation,
    preloader,
  };
};

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.locals.basedir = app.get('views');
('');

app.get('/', async (req, res) => {
  const api = await initApi(req);
  const defaults = await handleRequest(api);

  res.render('pages/home', {
    ...defaults,
  });
});

app.get('/about', async (req, res) => {
  const api = await initApi(req);
  const defaults = await handleRequest(api);

  res.render('pages/about', {
    ...defaults,
  });
});

app.get('/detail/:uid', async (req, res) => {
  const api = await initApi(req);
  const defaults = await handleRequest(api);

  const product = await api.getByUID('product', req.params.uid, {
    fetchLinks: 'collection.title',
  });

  // console.log(product);

  res.render('pages/detail', {
    ...defaults,
    product,
  });
});

// app.get('/collections', async (req, res) => {
//   const api = await initApi(req);
//   const defaults = await handleRequest(api);

//   res.render('pages/collections', {
//     ...defaults,
//   });
// });

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
