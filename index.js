const {ApolloServer, gql} = require('apollo-server');
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
        mostViewedMovies: [Movie]
    }
`;

const resolvers = {
  Query: {
    getAuthors(parent, args, context, info) {
      return Author.authors;
    },
    movie: async (_source, { id }, { dataSources }) => {
      return dataSources.moviesApi.getMovie(id);
    },
    mostViewedMovies: async (_source, _args, { dataSources }) => {
      return dataSources.moviesApi.getMostViewedMovies();
    },
  },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of authorResolvers.
const server = new ApolloServer({
  typeDefs: typeDefs,
  resolvers: merge(resolvers, Author.resolvers),
  cache: new RedisCache({
    host: 'redis-host',
    // other options...
  }),
  dataSources: () => ({
    moviesApi: new MoviesApi.MoviesAPI(),
    personalisationApi: new PersonalisationApi.PersonalizationAPI(),
  }),
  context: () => ({
    token: 'foo',
  }),
  tracing: true,
});

// The `listen` method launches a web server.
server.listen().then(({url}) => {
  console.log(`🚀  Server ready at ${url}`);
});
