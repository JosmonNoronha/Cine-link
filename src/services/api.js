const API_BASE_URL = "http://localhost:5000/api";

class ApiService {
  constructor() {
    this.token = localStorage.getItem("token");
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "API request failed");
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Movie methods
  async getTrendingMovies() {
    return this.request("/movies/trending");
  }

  async searchMovies(query) {
    return this.request(`/movies/search?q=${encodeURIComponent(query)}`);
  }

  async getMovieDetails(id) {
    return this.request(`/movies/${id}`);
  }

  // User methods
  async login(email, password) {
    const data = await this.request("/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    this.token = data.token;
    localStorage.setItem("token", this.token);
    return data;
  }

  async register(username, email, password) {
    const data = await this.request("/users/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });

    this.token = data.token;
    localStorage.setItem("token", this.token);
    return data;
  }

  logout() {
    this.token = null;
    localStorage.removeItem("token");
  }
}

export default new ApiService();
