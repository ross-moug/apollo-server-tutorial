const {ApolloServer, gql} = require('apollo-server');
const {defaultFieldResolver, GraphQLScalarType, Kind} = require('graphql');
const {SchemaDirectiveVisitor} = require('graphql-tools');
const GraphQLJSON = require('graphql-type-json');
const { find, filter } = require('lodash');

const myCustomScalarType = new GraphQLScalarType({
  name: 'MyCustomScalar',
  description: 'Description of my custom scalar type',
  serialize(value) {
    let result;
    // Implement custom behavior by setting the 'result' variable
    return result;
  },
  parseValue(value) {
    let result;
    // Implement custom behavior here by setting the 'result' variable
    return result;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.Int:
      // return a literal value, such as 1 or 'static string'
    }
  }
});

// Create (or import) a custom schema directive
class UpperCaseDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const {resolve = defaultFieldResolver} = field;
    field.resolve = async function (...args) {
      const result = await resolve.apply(this, args);
      if (typeof result === 'string') {
        return result.toUpperCase();
      }
      return result;
    };
  }
}

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = gql`
    # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.
    union Result = TextBook | ColouringBook | Author

    directive @deprecated(
        reason: String = "No longer supported"
    ) on FIELD_DEFINITION | ENUM_VALUE

    type ExampleType {
        newField: String
        oldField: String @deprecated(reason: "Use \`newField\`.")
    }

    # This "Book" type defines the queryable fields for every book in our data source.
    interface Book {
        title: String
        author: Author
    }

    type TextBook implements Book {
        title: String
        author: Author
        classes: [Class]
    }

    type ColouringBook implements Book {
        title: String
        author: Author
        colors: [Colour]
    }

    type Author {
        name: String
        books: [Book]
    }

    type Foo {
        aField: JSON
        anotherField: MyCustomScalar
    }

    type MyType {
        created: Date
    }

    # The "Query" type is special: it lists all of the available queries that
    # clients can execute, along with the return type for each. In this
    # case, the "books" query returns an array of zero or more Books (defined above).
    type Query {
        getBooks: [Book]
        getAuthors: [Author]
        getFoo: Foo
        favoriteColour: Colour # As a return value
        avatar(borderColor: Colour): String # As an argument
        search: [Result]
    }

    type Mutation {
        addBook(book: BookInput): Book
    }

    input BookInput {
        title: String
        author: String
    }

    interface MutationResponse {
        code: String!
        success: Boolean!
        message: String!
    }

    type AddBookMutationResponse implements MutationResponse {
        code: String!
        success: Boolean!
        message: String!
        book: Book
        Author: Author
    }

    scalar JSON
    scalar MyCustomScalar
    scalar Date

    enum Colour {
        RED
        GREEN
        BLUE
    }

    enum Class {
        English
        Maths
        Science
    }
`;

const books = [
  {
    title: 'Harry Potter and the Chamber of Secrets',
    author: 'J.K. Rowling',
  },
  {
    title: 'Jurassic Park',
    author: 'Michael Crichton',
  },
];

const authors = [
  {
    name: 'J.K. Rowling',
    title: 'Harry Potter and the Chamber of Secrets',
  },
  {
    name: 'Michael Crichton',
    title: 'Jurassic Park',
  },
];

// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const resolvers = {
  Book: {
    __resolveType(book, context, info) {
      if (book.classes) {
        return 'TextBook';
      }

      if (book.colors) {
        return 'ColoringBook';
      }

      return null;
    },
    author(book) {
      return filter(authors, { author: book.author });
    },
  },
  Author: {
    books(author) {
      return filter(books, { author: author.name });
    },
  },
  JSON: GraphQLJSON,
  MyCustomScalar: myCustomScalarType,
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue(value) {
      return new Date(value); // value from the client
    },
    serialize(value) {
      return value.getTime(); // value sent to the client
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return parseInt(ast.value, 10); // ast value is always in string format
      }
      return null;
    },
  }),
  Colour: {
    RED: '#f00',
    GREEN: '#0f0',
    BLUE: '#00f',
  },
  Result: {
    __resolveType(obj, context, info) {
      if (obj.name) {
        return 'Author';
      }

      if (obj.title) {
        return 'Book';
      }

      return null;
    },
  },
  Query: {
    getBooks(parent, args, context, info) {
      return find(books, {id: args.id});
    },
    getAuthors(parent, args, context, info) {
      return find(authors, {id: args.id});
    },
    favoriteColour: () => '#f00',
    avatar: (parent, args) => {
      // args.borderColor is 'RED', 'GREEN', or 'BLUE'
      return 'test'
    },
  },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs: typeDefs,
  resolvers: resolvers,
  schemaDirectives: {
    upper: UpperCaseDirective,
  }
});

// The `listen` method launches a web server.
server.listen().then(({url}) => {
  console.log(`🚀  Server ready at ${url}`);
});
