import View from "./View.js";

export default class Login extends View {
  constructor(navigateTo, params) {
    super(navigateTo, params);
  }

  async showError(response) {
    const error = await response.json();
    return `
      <p>Something went wrong:</p>
      <p>Response from the UID2 operator:</p>
      ${JSON.stringify(error)}
      <p>HTTP error:</p>
      ${response.status + ' ' + response.statusText}
      <p><a href="/" data-link>Back to the main page</a></p>
    `
  }

  async onLogin() {
    document.querySelector("#error_section").innerHTML = '';
    const email = document.getElementById("email");

      const response = await fetch("/login", {
        method: "POST",
        body: JSON.stringify({ email: email.value }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const result = await response.json();
        __uid2.setIdentity(result);
        this.navigateTo("/");
      } else {
        document.querySelector("#error_section").innerHTML = await this.showError(response);
      }
  }

  async getHtml() {
    return `
      <div id="error_section"></div>
      <div id="login_form" class="form">
          <form name="login_form">
              <div class="email_prompt">
                  <input type="text" id="email" name="email" placeholder="Enter an email address" style="border-style: none;">
              </div>
              <button type="button" class="button" id="login">Log in</button>
          </form>
      </div>
        `;
  }

  async afterRender() {
    document
      .getElementById("login")
      .addEventListener("click", this.onLogin.bind(this));
  }
}
