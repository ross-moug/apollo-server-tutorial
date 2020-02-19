const {fs} = require('file-system');
const {ApolloServer, gql} = require('apollo-server');
const {AuthenticationError, UserInputError} = require('apollo-server-errors');
const {RedisCache} = require('apollo-server-cache-redis');
const {merge} = require('lodash');

const Author = require('./author');
const MoviesApi = require('./movies-api');
const PersonalisationApi = require('./personalisation-api');

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

    type Query {
        getAuthors: [Author]
        movie: Movie
        mostViewedMovies: [Movie],
        readError: String
        authenticationError: String
    }

    type Mutation {
        userInputError(input: String): String
    }
`;

const resolvers = {
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
  context: () => ({
    token: 'foo',
  }),
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
server.listen().then(({url}) => {
  console.log(`🚀  Server ready at ${url}`);
});
