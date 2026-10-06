const API_URL = "https://anmqe3h4j0.execute-api.us-west-2.amazonaws.com";

const topicList = document.getElementById("topicList");

// Public portfolio view: read-only.
// Write operations stay out of the browser until the API has authenticated authorization.
async function loadTopics() {
    try {
        const response = await fetch(`${API_URL}/topics`);

        if (!response.ok) {
            throw new Error("Could not load topics.");
        }

        const topics = await response.json();
        displayTopics(topics);
    } catch (error) {
        console.error(error);
        topicList.innerHTML = "<p>Could not load topics from AWS.</p>";
    }
}

function displayTopics(topics) {
    topicList.innerHTML = "";

    if (topics.length === 0) {
        topicList.innerHTML = "<p>No topics added yet.</p>";
        return;
    }

    topics.forEach((topic) => {
        const topicCard = document.createElement("div");
        topicCard.classList.add("topic-card");

        const title = document.createElement("h3");
        title.textContent = topic.topic;

        const status = document.createElement("p");
        status.classList.add("status");
        status.textContent = `Status: ${topic.status}`;

        const notes = document.createElement("p");
        notes.textContent = topic.notes;

        topicCard.appendChild(title);
        topicCard.appendChild(status);
        topicCard.appendChild(notes);
        topicList.appendChild(topicCard);
    });
}

loadTopics();
