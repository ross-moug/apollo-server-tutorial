const { RESTDataSource } = require('apollo-datasource-rest');

class MoviesAPI extends RESTDataSource {
  constructor() {
    super();
  }

  async getMovie(id) {
    return this.get(`movies/${id}`);
  }

  async getMostViewedMovies(limit = 10) {
    const data = await this.get('movies', {
      per_page: limit,
      order_by: 'most_viewed',
    });
    return data.results;
  }

  get baseURL() {
    if (this.context.env === 'development') {
      return 'https://movies-api-dev.example.com/';
    } else {
      return 'https://movies-api.example.com/';
    }
  }
}

module.exports = {
  MoviesAPI,
};
