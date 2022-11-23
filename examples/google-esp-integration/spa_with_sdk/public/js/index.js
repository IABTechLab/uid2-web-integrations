import Main from "./views/Main.js";
import Login from "./views/Login.js";
import Content from "./views/Content.js";

const pathToRegex = path => new RegExp("^" + path.replace(/\//g, "\\/").replace(/:\w+/g, "(.+)") + "$");

const getParams = match => {
    const values = match.result.slice(1);
    const keys = Array.from(match.route.path.matchAll(/:(\w+)/g)).map(result => result[1]);

    return Object.fromEntries(keys.map((key, i) => {
        return [key, values[i]];
    }));
};

const navigateTo = url => {
    history.pushState(null, null, url);
    router();
};

const router = async () => {
    const routes = [
        { path: "/", view: Main },
        { path: "/login", view: Login },
        { path: "/content/:id", view: Content },
    ];
    const potentialMatches = routes.map(route => {
        return {
            route: route,
            result: location.pathname.match(pathToRegex(route.path))
        };
    });

    let match = potentialMatches.find(potentialMatch => potentialMatch.result !== null);

    if (!match) {
        match = {
            route: routes[0],
            result: [location.pathname]
        };
    }
    if (__uid2.isLoginRequired()) {
        match = {
            route: routes[1],
            result: [location.pathname]
        }
    }

    const view = new match.route.view(navigateTo, getParams(match));
    document.querySelector("#app").innerHTML = await view.getHtml();
    await view.afterRender();
};

window.addEventListener("popstate", router);

document.addEventListener("DOMContentLoaded", () => {
    document.body.addEventListener("click", e => {
        if (e.target.matches("[data-link]")) {
            e.preventDefault();
            navigateTo(e.target.href);
        }
    });

    router();
});

window.__uid2 = window.__uid2 || { callbacks: [] };
window.__uid2.callbacks.push((eventType) => {
  if (eventType === 'SdkLoaded') {
    __uid2.init({
      enableESP: true
    });
  }
});