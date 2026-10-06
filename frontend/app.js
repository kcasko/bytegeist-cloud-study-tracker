const API_URL = "https://anmqe3h4j0.execute-api.us-west-2.amazonaws.com";
const COGNITO_DOMAIN = "https://bytegeist-study-227755136653.auth.us-west-2.amazoncognito.com";
const CLIENT_ID = "12hfvgnukhif81f9jh4rd74lqn";
const REDIRECT_URI = "https://tracker.casko.dev/";
const SCOPES = "openid email profile";

const publicTopicList = document.getElementById("publicTopicList");
const privateTopicList = document.getElementById("privateTopicList");
const privateSection = document.getElementById("privateSection");
const authStatus = document.getElementById("authStatus");
const authControls = document.getElementById("authControls");
const topicForm = document.getElementById("topicForm");
const topicId = document.getElementById("topicId");
const topicInput = document.getElementById("topic");
const statusInput = document.getElementById("status");
const notesInput = document.getElementById("notes");
const saveButton = document.getElementById("saveButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const signInButton = document.getElementById("signInButton");
const signUpButton = document.getElementById("signUpButton");

function base64UrlEncode(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

async function sha256(value) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

function randomString(length = 64) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
}

function decodeJwt(token) {
    try {
        const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(decodeURIComponent(atob(payload).split("").map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")));
    } catch {
        return {};
    }
}

function clearSession() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("id_token");
    sessionStorage.removeItem("refresh_token");
}

function getSession() {
    const accessToken = sessionStorage.getItem("access_token");
    const idToken = sessionStorage.getItem("id_token");
    if (!accessToken || !idToken) return null;

    const accessClaims = decodeJwt(accessToken);
    if (!accessClaims.exp || accessClaims.exp * 1000 <= Date.now()) {
        clearSession();
        return null;
    }

    return {
        accessToken,
        idToken,
        claims: decodeJwt(idToken)
    };
}

async function beginAuth(screen = "login") {
    const verifier = randomString(64);
    const challenge = base64UrlEncode(await sha256(verifier));
    const state = randomString(32);

    sessionStorage.setItem("pkce_verifier", verifier);
    sessionStorage.setItem("oauth_state", state);

    const endpoint = screen === "signup" ? "signup" : "login";
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: "code",
        scope: SCOPES,
        redirect_uri: REDIRECT_URI,
        code_challenge: challenge,
        code_challenge_method: "S256",
        state
    });

    window.location.href = `${COGNITO_DOMAIN}/${endpoint}?${params}`;
}

async function handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
        authStatus.textContent = params.get("error_description") || error;
        history.replaceState({}, "", "/");
        return;
    }

    if (!code) return;

    const expectedState = sessionStorage.getItem("oauth_state");
    const returnedState = params.get("state");
    const verifier = sessionStorage.getItem("pkce_verifier");

    if (!verifier || !expectedState || expectedState !== returnedState) {
        authStatus.textContent = "Could not verify the sign-in response. Please try again.";
        history.replaceState({}, "", "/");
        return;
    }

    const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier
    });

    const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
    });

    if (!response.ok) {
        authStatus.textContent = "Sign-in token exchange failed. Please try again.";
        history.replaceState({}, "", "/");
        return;
    }

    const tokens = await response.json();
    sessionStorage.setItem("access_token", tokens.access_token);
    sessionStorage.setItem("id_token", tokens.id_token);
    if (tokens.refresh_token) {
        sessionStorage.setItem("refresh_token", tokens.refresh_token);
    }

    sessionStorage.removeItem("pkce_verifier");
    sessionStorage.removeItem("oauth_state");
    history.replaceState({}, "", "/");
}

function authHeaders() {
    const session = getSession();
    return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

function renderTopicList(container, topics, editable = false) {
    container.innerHTML = "";

    if (!topics.length) {
        container.innerHTML = editable
            ? "<p>You have no private topics yet. Add your first one above.</p>"
            : "<p>No public demo topics are available.</p>";
        return;
    }

    for (const topic of topics) {
        const card = document.createElement("article");
        card.className = "topic-card";

        const title = document.createElement("h3");
        title.textContent = topic.topic;

        const status = document.createElement("p");
        status.className = "status";
        status.textContent = `Status: ${topic.status}`;

        const notes = document.createElement("p");
        notes.textContent = topic.notes || "No notes yet.";

        card.append(title, status, notes);

        if (editable) {
            const actions = document.createElement("div");
            actions.className = "card-actions";

            const edit = document.createElement("button");
            edit.className = "button secondary";
            edit.type = "button";
            edit.textContent = "Edit";
            edit.addEventListener("click", () => startEdit(topic));

            const remove = document.createElement("button");
            remove.className = "button danger";
            remove.type = "button";
            remove.textContent = "Delete";
            remove.addEventListener("click", () => deleteTopic(topic.id, topic.topic));

            actions.append(edit, remove);
            card.append(actions);
        }

        container.appendChild(card);
    }
}

async function loadPublicTopics() {
    try {
        const response = await fetch(`${API_URL}/topics`);
        if (!response.ok) throw new Error("Could not load public topics.");
        renderTopicList(publicTopicList, await response.json(), false);
    } catch (error) {
        console.error(error);
        publicTopicList.innerHTML = "<p>Could not load public topics from AWS.</p>";
    }
}

async function loadPrivateTopics() {
    if (!getSession()) return;

    try {
        const response = await fetch(`${API_URL}/my-topics`, {
            headers: authHeaders()
        });

        if (response.status === 401) {
            clearSession();
            renderAuth();
            return;
        }

        if (!response.ok) throw new Error("Could not load private topics.");
        renderTopicList(privateTopicList, await response.json(), true);
    } catch (error) {
        console.error(error);
        privateTopicList.innerHTML = "<p>Could not load your private topics.</p>";
    }
}

function startEdit(topic) {
    topicId.value = topic.id;
    topicInput.value = topic.topic;
    statusInput.value = topic.status;
    notesInput.value = topic.notes || "";
    saveButton.textContent = "Save Changes";
    cancelEditButton.classList.remove("hidden");
    topicInput.focus();
}

function resetForm() {
    topicForm.reset();
    topicId.value = "";
    saveButton.textContent = "Add Topic";
    cancelEditButton.classList.add("hidden");
}

async function saveTopic(event) {
    event.preventDefault();

    if (!getSession()) {
        await beginAuth("login");
        return;
    }

    const payload = {
        topic: topicInput.value.trim(),
        status: statusInput.value,
        notes: notesInput.value.trim()
    };

    const id = topicId.value;
    const url = id
        ? `${API_URL}/topics/${encodeURIComponent(id)}`
        : `${API_URL}/topics`;
    const method = id ? "PUT" : "POST";

    const response = await fetch(url, {
        method,
        headers: {
            ...authHeaders(),
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        alert(body.message || "Could not save the topic.");
        return;
    }

    resetForm();
    await loadPrivateTopics();
}

async function deleteTopic(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;

    const response = await fetch(`${API_URL}/topics/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: authHeaders()
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        alert(body.message || "Could not delete the topic.");
        return;
    }

    await loadPrivateTopics();
}

function renderAuth() {
    const session = getSession();

    if (!session) {
        privateSection.classList.add("hidden");
        authStatus.textContent = "Public demo mode. Sign in to create and manage your own private study topics.";
        authControls.innerHTML = "";
        authControls.append(signInButton, signUpButton);
        return;
    }

    const identity = session.claims.email || session.claims.name || "signed-in user";
    authStatus.textContent = `Signed in as ${identity}. Your study topics are private to your account.`;
    privateSection.classList.remove("hidden");

    const signOut = document.createElement("button");
    signOut.className = "button secondary";
    signOut.type = "button";
    signOut.textContent = "Sign Out";
    signOut.addEventListener("click", () => {
        clearSession();
        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            logout_uri: REDIRECT_URI
        });
        window.location.href = `${COGNITO_DOMAIN}/logout?${params}`;
    });

    authControls.innerHTML = "";
    authControls.appendChild(signOut);
}

signInButton.addEventListener("click", () => beginAuth("login"));
signUpButton.addEventListener("click", () => beginAuth("signup"));
topicForm.addEventListener("submit", saveTopic);
cancelEditButton.addEventListener("click", resetForm);

(async function init() {
    await handleOAuthCallback();
    renderAuth();
    await loadPublicTopics();

    if (getSession()) {
        await loadPrivateTopics();
    }
})();
