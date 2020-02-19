const { filter } = require('lodash');

const Book = require('./book');

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

const resolvers = {
  Author: {
    books(author) {
      return filter(Book.books, { author: author.name });
    },
  },
};

module.exports = {
  authors,
  resolvers,
};
