import View from "./View.js";

export default class MainView extends View {
  constructor(navigateTo, params) {
    super(navigateTo, params);
  }

  async getHtml() {
    return `
      <table id="uid2_state">
          <tr>
              <td class="label">Ready for Targeted Advertising:</td>
              <td class="value">${
                __uid2.getAdvertisingToken() ? "yes" : "no"
              }</td>
          </tr>
          <tr>
              <td class="label">UID2 Advertising Token:</td>
              <td class="value">${__uid2.getAdvertisingToken()}</td>
          </tr>
          <tr>
              <td class="label">Is UID2 Login Required?</td>
              <td class="value">${
                __uid2.isLoginRequired() ? "yes" : "no"
              }</td>
          </tr>
      </table>
      <div class="form">
          <button type="button" class="button" id="logout">Log Out</button>
      </div>
      `;
  }

  onLogout() {
    window.__uid2.disconnect();
    window.googletag.encryptedSignalProviders.clearAllCache();
    this.navigateTo("/login");
  }

  async afterRender() {
    document
      .getElementById("logout")
      .addEventListener("click", this.onLogout.bind(this));
  }
}
