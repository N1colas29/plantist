document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("account-form");
  const switchMode = document.getElementById("switch-mode");

  if (!form) return;

  let signInMode = false;

  const title = document.getElementById("form-title");
  const note = document.getElementById("form-note");
  const submitButton = document.getElementById("submit-button");
  const message = document.getElementById("message");
  const nameField = document.querySelector(".name-field");
  const profileField = document.querySelector(".profile-field");
  const backHome = document.getElementById("back-home");

  function updateForm() {
    title.textContent = signInMode ? "welcome back" : "join us";
    note.textContent = signInMode? "Sign in to continue to plantist." : "Create an account, or sign in below.";
    submitButton.textContent = signInMode ? "Sign in" : "Create account";
    switchMode.textContent = signInMode? "New here? Create an account" : "Already have an account? Sign in";

    nameField.style.display = signInMode ? "none" : "block";
    profileField.style.display = signInMode ? "none" : "block";
  }

  switchMode.addEventListener("click", () => {
    signInMode = !signInMode;
    message.textContent = "";
    form.reset();
    updateForm();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const name = document.getElementById("name").value.trim();
    const profile = document.getElementById("profile").files[0];

    const accounts = JSON.parse(localStorage.getItem("plantistAccounts") || "{}");

    if (!username || !password) return;

    if (signInMode) {
      if (!accounts[username] || accounts[username].password !== password) {
        message.textContent = "That username or password is not correct.";
        return;
      }

      localStorage.setItem("plantistCurrentUser", username);
      message.textContent = "welcome back.";
    } else {
      if (accounts[username]) {
        message.textContent = "That username is already taken.";
        return;
      }

      accounts[username] = {
        username,
        name,
        password,
        profileName: profile ? profile.name : ""
      };

      localStorage.setItem("plantistAccounts", JSON.stringify(accounts));
      localStorage.setItem("plantistCurrentUser", username);
      message.textContent = "thank you for joining;";
    }

    form.reset();
    backHome.style.display = "block";
  });

  updateForm();
});