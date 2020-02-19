const {ApolloServer, gql} = require('apollo-server');
const {merge} = require('lodash');

const Author = require('./author');

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

    type Query {
        getAuthors: [Author]
    }
`;

const resolvers = {
  Query: {
    getAuthors(parent, args, context, info) {
      return Author.authors;
    },
  },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of authorResolvers.
const server = new ApolloServer({
  typeDefs: typeDefs,
  resolvers: merge(resolvers, Author.resolvers),
  tracing: true,
});

// The `listen` method launches a web server.
server.listen().then(({url}) => {
  console.log(`🚀  Server ready at ${url}`);
});
