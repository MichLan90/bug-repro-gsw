const path = require("path");
const { colord } = require("colord");

// 🎨 Helper template function so prettier autoformats our GraphQL.
const gql = (s) => s.join("");

exports.createPages = async ({ graphql, actions }) => {
  const { createPage, createRedirect } = actions;

  const {
    data: {
      allWpPage,
      frontPage,
      favouriteListPage,
      articles,
      productCategoryPage,
      allWpPost,
      allWpProduct,
      allWpProductCategory,
      wp: {
        wcSettings: { checkoutUrl, checkoutOrderReceivedUrl },
        seo: { redirects },
      },
    },
  } = await graphql(gql`
    {
      allWpPage: allWpPage(filter: { isFrontPage: { eq: false } }) {
        nodes {
          id
          uri
        }
      }
      favouriteListPage: allWpPage(
        filter: { isFavouriteListPage: { eq: true } }
      ) {
        nodes {
          id
          uri
        }
      }
      productCategoryPage: allWpProductCategory(
        filter: { crbMasterCategory: { eq: true } }
      ) {
        nodes {
          id
          uri
          slug
        }
      }
      frontPage: allWpPage(filter: { isFrontPage: { eq: true } }) {
        nodes {
          id
        }
      }
      articles: allWpPage(filter: { isPostsPage: { eq: true } }) {
        nodes {
          uri
          id
          title
        }
      }
      allWpProductCategory: allWpProductCategory {
        nodes {
          title: name
          uri
          id
          wpChildren {
            nodes {
              name
              uri
              id
            }
          }
        }
      }
      allWpPost: allWpPost {
        nodes {
          uri
          id
        }
      }
      allWpProduct: allWpProduct {
        nodes {
          ... on WpVariableProduct {
            id
            name
            uri
          }
          ... on WpExternalProduct {
            id
            name
            uri
          }
          ... on WpGroupProduct {
            id
            name
            uri
          }
          ... on WpSimpleProduct {
            id
            name
            uri
          }
        }
      }
      wp {
        wcSettings {
          checkoutUrl
          checkoutOrderReceivedUrl
        }
        seo {
          redirects {
            format
            origin
            target
            type
          }
        }
      }
    }
  `);

  allWpPage.nodes.forEach(({ id, uri }) => {
    createPage({
      path: uri,
      component: path.resolve("./src/templates/page.js"),
      matchPath: [checkoutUrl, checkoutOrderReceivedUrl].includes(uri)
        ? `${uri}*`
        : undefined,
      context: {
        id,
      },
    });
  });
  if (articles.nodes.length > 0) {
    createPage({
      path: articles.nodes[0].uri,
      component: path.resolve("./src/templates/articles.js"),
      context: {
        uri: articles.nodes[0].uri,
        title: articles.nodes[0].title,
        id: articles.nodes[0].id,
      },
    });
  }
  if (frontPage.nodes.length > 0) {
    createPage({
      path: "/",
      component: path.resolve("./src/templates/page.js"),
      context: { id: frontPage.nodes[0].id },
    });
  } else {
    /* Display _something_ as a front page until one has been manually
     * selected in WordPress. */
    createPage({
      path: "/",
      component: path.resolve("./src/templates/page.js"),
      context: { id: allWpPage.nodes[0].id },
    });
  }

  /* Specific template for favourite list page */
  if (favouriteListPage.nodes.length > 0) {
    createPage({
      path: favouriteListPage.nodes[0].uri,
      component: path.resolve("./src/templates/favourites.js"),
      context: { id: favouriteListPage.nodes[0].id },
    });
  }
  /* Specific template for product category page */
  if (productCategoryPage.nodes.length > 0) {
    createPage({
      path: productCategoryPage.nodes[0].uri,
      component: path.resolve("./src/templates/productCategory.js"),
      context: {
        uri: productCategoryPage.nodes[0].uri,
        title: productCategoryPage.nodes[0].title,
        id: productCategoryPage.nodes[0].id,
      },
    });
  }
  /** Create page for every product category */
  allWpProductCategory.nodes.forEach(({ id, uri }) => {
    createPage({
      path: uri,
      component: path.resolve("./src/templates/productCategory.js"),
      context: { id },
    });
  });
  allWpPost.nodes.forEach(({ id, uri }) => {
    createPage({
      path: uri,
      component: path.resolve("./src/templates/article.js"),
      context: { id },
    });
  });
  allWpProduct.nodes.forEach(({ id, uri }) => {
    createPage({
      path: uri,
      component: path.resolve("./src/templates/product.js"),
      context: { id },
    });
  });

  const prependSlash = (url) => (url?.[0] !== "/" ? `/${url}` : url);
  const appendSlash = (url) => (url?.slice(-1) !== "/" ? `${url}/` : url);
  const addSlashes = (url) => appendSlash(prependSlash(url));
  const createRedirectPermutations = ({ fromPath, toPath, ...rest }) => {
    // Add redirects both with and without trailing slashes in fromPath.
    createRedirect({
      fromPath: prependSlash(fromPath),
      toPath: addSlashes(toPath),
      ...rest,
    });

    // Add another redirect if fromPath does not end in a slash.
    if (
      prependSlash(fromPath)?.slice(-1) !== "/" &&
      addSlashes(fromPath) !== addSlashes(toPath)
    ) {
      createRedirect({
        fromPath: addSlashes(fromPath),
        toPath: addSlashes(toPath),
        ...rest,
      });
    }
  };

  redirects.forEach((redirect) => {
    if (redirect.format === "plain") {
      if ([301, 302].includes(redirect.type)) {
        createRedirectPermutations({
          fromPath: redirect.origin,
          toPath: redirect.target,
          isPermanent: redirect.type === 301,
        });
      }
    }
  });
};

exports.createResolvers = ({ createResolvers }) => {
  const parseStyle = (source) => {
    try {
      return JSON.parse(source.style);
    } catch {
      return null;
    }
  };

  const resolvers = {
    WpCoreCoverBlockAttributes: {
      duotoneColorValues: {
        type: "JSON",
        resolve: (source) => {
          const colors = parseStyle(source)?.color?.duotone || null;
          if (!colors) {
            return null;
          }
          const values = { r: [], g: [], b: [], a: [] };
          colors.forEach((color) => {
            const rgbColor = colord(color).toRgb();
            values.r.push(rgbColor.r / 255);
            values.g.push(rgbColor.g / 255);
            values.b.push(rgbColor.b / 255);
            values.a.push(rgbColor.a);
          });
          return JSON.stringify({
            r: values.r.join(" "),
            g: values.g.join(" "),
            b: values.b.join(" "),
            a: values.a.join(" "),
          });
        },
      },
    },
    WpContactForm7ContactFormSelectorBlockAttributes: {
      formTemplate: {
        type: "String",
        resolve: (source) => {
          const containsInput = (input) =>
            source.rendered?.includes(`name="${input}"`);
          const containsInputs = (inputs) =>
            inputs.reduce(
              (containsInputs, input) => containsInputs && containsInput(input),
              true
            );
          if (
            containsInputs([
              "send-request-firstname",
              "send-request-lastname",
              "send-request-email",
              "send-request-phone",
            ])
          ) {
            return "send-request";
          }
          return "contact-form";
        },
      },
    },
  };
  createResolvers(resolvers);
};

exports.createSchemaCustomization = ({ actions: { createTypes } }) => {
  createTypes(gql`
    type WpBlockAttributesObject {
      _: String
    }
    type WpUnknownBlock implements WpBlock {
      attributesJSON: String
      dynamicContent: String
      innerBlocks: [WpBlock!]
      isDynamic: Boolean!
      name: String!
      order: Int!
      originalContent: String
      parentNode: WpNode!
      parentNodeDatabaseId: Int!
      saveContent: String
    }
  `);
};

// Implement the Gatsby API “onCreatePage”. This is
// called after every page is created.
exports.onCreatePage = async ({ page, actions }) => {
  const { createPage } = actions;
  // page.matchPath is a special key that's used for matching pages
  // only on the client.
  if (page.path.match(/^\/app/)) {
    page.matchPath = "/*/";
    // Update the page.
    createPage(page);
  }
};
