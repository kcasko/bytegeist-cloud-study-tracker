const API_URL = "https://anmqe3h4j0.execute-api.us-west-2.amazonaws.com";

const topicForm = document.getElementById("topicForm");
const topicList = document.getElementById("topicList");


// Load topics when the page opens
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

        topicList.innerHTML = `
            <p>Could not load topics from AWS.</p>
        `;
    }
}


// Display all topics
function displayTopics(topics) {
    topicList.innerHTML = "";

    if (topics.length === 0) {
        topicList.innerHTML = `
            <p>No topics added yet.</p>
        `;

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

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            editTopic(topic);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteTopic(topic.id);
        });

        topicCard.appendChild(title);
        topicCard.appendChild(status);
        topicCard.appendChild(notes);
        topicCard.appendChild(editButton);
        topicCard.appendChild(deleteButton);

        topicList.appendChild(topicCard);
    });
}


// Add a new topic
topicForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const topic = document.getElementById("topic").value;
    const status = document.getElementById("status").value;
    const notes = document.getElementById("notes").value;

    const newTopic = {
        topic: topic,
        status: status,
        notes: notes
    };

    try {
        const response = await fetch(`${API_URL}/topics`, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(newTopic)
        });

        if (!response.ok) {
            throw new Error("Could not add topic.");
        }

        topicForm.reset();

        await loadTopics();
    } catch (error) {
        console.error(error);

        alert("Could not add topic.");
    }
});


// Update an existing topic
async function editTopic(topic) {
    const newTopicName = prompt(
        "Topic name:",
        topic.topic
    );

    if (newTopicName === null) {
        return;
    }

    const newStatus = prompt(
        "Status: Not Started, Learning, or Completed",
        topic.status
    );

    if (newStatus === null) {
        return;
    }

    const newNotes = prompt(
        "Notes:",
        topic.notes
    );

    if (newNotes === null) {
        return;
    }

    const updatedTopic = {
        topic: newTopicName,
        status: newStatus,
        notes: newNotes
    };

    try {
        const response = await fetch(
            `${API_URL}/topics/${topic.id}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(updatedTopic)
            }
        );

        if (!response.ok) {
            throw new Error("Could not update topic.");
        }

        await loadTopics();
    } catch (error) {
        console.error(error);

        alert("Could not update topic.");
    }
}


// Delete a topic
async function deleteTopic(id) {
    const confirmed = confirm(
        "Are you sure you want to delete this topic?"
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/topics/${id}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            throw new Error("Could not delete topic.");
        }

        await loadTopics();
    } catch (error) {
        console.error(error);

        alert("Could not delete topic.");
    }
}


// Run when the page first loads
loadTopics();