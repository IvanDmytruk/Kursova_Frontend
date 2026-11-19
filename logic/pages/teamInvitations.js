
(() => {
    let selectedUser = null;
    let searchTimer = null;
    let searchVersion = 0;

    function getCurrentUser() {
        try {
            return JSON.parse(
                localStorage.getItem("user") || "{}"
            );
        } catch {
            return {};
        }
    }

    function getUserId() {
        const user = getCurrentUser();

        return String(
            user.id ?? user.userId ?? ""
        );
    }

    function setMessage(message, isError = false) {
        const element = document.getElementById(
            "inviteUserMessage"
        );

        element.textContent = message;
        element.className = isError
            ? "small mt-3 text-danger"
            : "small mt-3 text-success";
    }

    function resetSearch() {
        selectedUser = null;
        searchVersion++;

        document.getElementById(
            "inviteUserSearch"
        ).value = "";

        document.getElementById(
            "inviteSearchResults"
        ).replaceChildren();

        document.getElementById(
            "inviteSelectedUser"
        ).style.display = "none";

        document.getElementById(
            "sendTeamInvitationBtn"
        ).disabled = true;

        document.getElementById(
            "inviteUserRole"
        ).value = "Player";

        setMessage("");
    }

    function selectUser(user) {
        selectedUser = user;

        const name = [
            user.name,
            user.surname
        ].filter(Boolean).join(" ");

        const selected = document.getElementById(
            "inviteSelectedUser"
        );

        selected.textContent =
            `Вибрано: ${name || "Користувач"}`;

        selected.style.display = "block";

        document.getElementById(
            "sendTeamInvitationBtn"
        ).disabled = false;

        document.getElementById(
            "inviteSearchResults"
        ).replaceChildren();

        setMessage("");
    }

    async function searchUsers(term) {
        const version = ++searchVersion;

        const results = document.getElementById(
            "inviteSearchResults"
        );

        results.replaceChildren();

        if (term.length < 2) {
            return;
        }

        const loading = document.createElement("div");
        loading.className =
            "list-group-item text-muted";

        loading.textContent = "Пошук...";
        results.appendChild(loading);

        try {
            const url =
                `${window.teamsApi.url}/users/search` +
                `?term=${encodeURIComponent(term)}`;

            const users = await window.teamsApi.get(url);

            if (version !== searchVersion) return;

            results.replaceChildren();

            if (!Array.isArray(users) ||
                users.length === 0) {

                const empty = document.createElement("div");
                empty.className =
                    "list-group-item text-muted";

                empty.textContent =
                    "Користувачів не знайдено";

                results.appendChild(empty);
                return;
            }

            for (const user of users) {
                const button = document.createElement(
                    "button"
                );

                button.type = "button";
                button.className =
                    "list-group-item list-group-item-action";

                button.textContent = [
                    user.name,
                    user.surname
                ].filter(Boolean).join(" ");

                button.addEventListener(
                    "click",
                    () => selectUser(user)
                );

                results.appendChild(button);
            }
        } catch (error) {
            if (version !== searchVersion) return;

            results.replaceChildren();

            setMessage(
                error.message || "Помилка пошуку",
                true
            );
        }
    }

    async function updateInviteButton() {
        const button = document.getElementById(
            "inviteTeamMemberBtn"
        );

        button.style.display = "none";

        if (!window.currentTeam &&
            typeof currentTeam === "undefined") {
            return;
        }

        const team = typeof currentTeam !== "undefined"
            ? currentTeam
            : window.currentTeam;

        if (!team?.id) return;

        if (!localStorage.getItem("accessToken")) {
            return;
        }

        const user = getCurrentUser();
        const userId = getUserId();

        if (!userId) return;

        const isOwner =
            String(team.ownerId) === userId;

        const isAdmin =
            String(user.role ?? "").toLowerCase() ===
            "admin";

        let canInvite = isOwner || isAdmin;

        if (!canInvite) {
            try {
                const members = await window.teamsApi.get(
                    `${window.teamsApi.url}/` +
                    `${encodeURIComponent(team.id)}/members`
                );

                const membership = members.find(
                    member =>
                        String(member.userId) === userId
                );

                canInvite = Boolean(
                    membership &&
                    ["Captain", "Coach"].includes(
                        membership.role
                    )
                );
            } catch (error) {
                console.error(
                    "Помилка перевірки ролі:",
                    error
                );
            }
        }

        button.style.display = canInvite
            ? "inline-block"
            : "none";
    }

    async function sendInvitation() {
        if (!selectedUser) return;

        const team = typeof currentTeam !== "undefined"
            ? currentTeam
            : window.currentTeam;

        if (!team?.id) {
            setMessage("Команду не завантажено", true);
            return;
        }

        const button = document.getElementById(
            "sendTeamInvitationBtn"
        );

        const role = document.getElementById(
            "inviteUserRole"
        ).value;

        button.disabled = true;

        try {
            await window.teamsApi.post(
                `${window.teamsApi.url}/` +
                `${encodeURIComponent(team.id)}/invitations`,
                {
                    userId: selectedUser.id,
                    role
                }
            );

            const modalElement =
                document.getElementById(
                    "inviteTeamMemberModal"
                );

            bootstrap.Modal
                .getOrCreateInstance(modalElement)
                .hide();

            if (typeof showNotification === "function") {
                showNotification(
                    "Запрошення успішно надіслано!",
                    "success"
                );
            }

            resetSearch();
        } catch (error) {
            setMessage(
                error.message ||
                "Не вдалося надіслати запрошення",
                true
            );
        } finally {
            button.disabled = !selectedUser;
        }
    }

    document.addEventListener(
        "DOMContentLoaded",
        () => {
            const modal = document.getElementById(
                "inviteTeamMemberModal"
            );

            const input = document.getElementById(
                "inviteUserSearch"
            );

            modal.addEventListener(
                "show.bs.modal",
                resetSearch
            );

            input.addEventListener("input", () => {
                clearTimeout(searchTimer);

                selectedUser = null;

                document.getElementById(
                    "sendTeamInvitationBtn"
                ).disabled = true;

                document.getElementById(
                    "inviteSelectedUser"
                ).style.display = "none";

                const term = input.value.trim();

                if (term.length < 2) {
                    searchVersion++;

                    document.getElementById(
                        "inviteSearchResults"
                    ).replaceChildren();

                    return;
                }

                searchTimer = setTimeout(
                    () => searchUsers(term),
                    300
                );
            });

            document.getElementById(
                "sendTeamInvitationBtn"
            ).addEventListener(
                "click",
                sendInvitation
            );
        }
    );

    window.updateInviteButton = updateInviteButton;
})();
