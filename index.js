const {fs} = require('file-system');
const {ApolloServer, gql, PubSub, withFilter} = require('apollo-server');
const {AuthenticationError, UserInputError} = require('apollo-server-errors');
const {RedisCache} = require('apollo-server-cache-redis');
const {merge} = require('lodash');

const Author = require('./author');
const MoviesApi = require('./movies-api');
const PersonalisationApi = require('./personalisation-api');
const Post = require('./post');

const COMMENT_ADDED = 'COMMENT_ADDED';
const POST_ADDED = 'POST_ADDED';
const pubSub = new PubSub();

const validateToken = authToken => {
  // ... validate token and return a Promise, rejects in case of an error
  return true;
};

const findUser = authToken => {
  return tokenValidationResult => {
    // ... finds user by auth token and return a Promise, rejects in case of an error
    return {
      username: 'test user',
    };
  };
};

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = gql`
    type Book {
        title: String
        author: Author
    }

    type Author {
        name: String
        books: [Book]
    }

    type Movie {
        title: String
    }

    type Post {
        author: String
        comment: String
    }

    type Comment {
        id: String
        content: String
        repoName: String
    }

    type Subscription {
        postAdded: Post
        commentAdded(repoFullName: String): [Comment]
    }

    type Query {
        getAuthors: [Author]
        movie: Movie
        mostViewedMovies: [Movie],
        posts: [Post]
        readError: String
        authenticationError: String
    }

    type Mutation {
        userInputError(input: String): String
        addPost(author: String, comment: String): Post
        addComment(repoName: String, content: String): Comment
    }
`;

const resolvers = {
  Subscription: {
    postAdded: {
      // Additional event labels can be passed to asyncIterator creation
      subscribe: () => pubSub.asyncIterator([POST_ADDED]),
    },
    commentAdded: {
      subscribe: withFilter(
        () => pubSub.asyncIterator(COMMENT_ADDED),
        (payload, variables) => {
          return payload.commentAdded.repoName === variables.repoFullName;
        },
      ),
    }
  },
  Query: {
    getAuthors(parent, args, context, info) {
      return Author.authors;
    },
    movie: async (_source, {id}, {dataSources}) => {
      return dataSources.moviesApi.getMovie(id);
    },
    mostViewedMovies: async (_source, _args, {dataSources}) => {
      return dataSources.moviesApi.getMostViewedMovies();
    },
    posts(root, args, context) {
      return Post.posts();
    },
    readError: (parent, args, context) => {
      return fs.readFileSync('/non/existent/file');
    },
    authenticationError: (parent, args, context) => {
      throw new AuthenticationError('must authenticate');
    },
  },
  Mutation: {
    userInputError: (parent, args, context, info) => {
      if (args.input !== 'expected') {
        throw new UserInputError('Form Arguments invalid', {
          invalidArgs: Object.keys(args),
        });
      }
    },
    addPost(root, args, context) {
      pubSub.publish(POST_ADDED, { postAdded: args });
      return Post.addPost(args);
    },
    addComment(root, args, context) {
      pubSub.publish(COMMENT_ADDED, {commentAdded: args});
      return null;
    },
  },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of authorResolvers.
const server = new ApolloServer({
  typeDefs: typeDefs,
  resolvers: merge(resolvers, Author.resolvers),
  // cache: new RedisCache({
  //   host: 'redis-host',
  //   // other options...
  // }),
  dataSources: () => ({
    moviesApi: new MoviesApi.MoviesAPI(),
    personalisationApi: new PersonalisationApi.PersonalizationAPI(),
  }),
  context: async ({ req, connection }) => {
    if (connection) {
      // check connection for metadata
      return connection.context;
    } else {
      // check from req
      const token = req.headers.authorization || "foo";

      return { token };
    }
  },
  subscriptions: {
    onConnect: (connectionParams, webSocket) => {
      if (connectionParams.authToken) {
        return validateToken(connectionParams.authToken)
          .then(findUser(connectionParams.authToken))
          .then(user => {
            return {
              currentUser: user,
            };
          });
      }

      // throw new Error('Missing auth token!');
    },
  },
  engine: {
    // Rewrite errors before they are sent to Apollo Graph Manager
    rewriteError(err) {
      // Return `null` to avoid reporting `AuthenticationError`s
      if (err instanceof AuthenticationError) {
        return null;
      }
      // All other errors will be reported.
      return err;
    }
  },
  formatError: (err) => {
    // Don't give the specific errors to the client.
    if (err.originalError instanceof AuthenticationError) {
      return new Error('Internal server error');
    }

    // Otherwise return the original error.  The error can also
    // be manipulated in other ways, so long as it's returned.
    return err;
  },
  tracing: true,
  // Pass debug as false to disable stacktraces
  // debug: false,
});

// The `listen` method launches a web server.
server.listen().then(({url, subscriptionsUrl}) => {
  console.log(`🚀  Server ready at ${url}`);
  console.log(`🚀 Subscriptions ready at ${subscriptionsUrl}`);
});
