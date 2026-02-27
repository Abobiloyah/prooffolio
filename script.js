/* ═══════════════════════════════════════════
   Content Show Glass — Application Logic
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  // ── Storage helpers ──
  const STORAGE_KEY = "csg_profiles";

  function loadProfiles() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveProfiles(profiles) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  }

  function getProfile(username) {
    return loadProfiles()[username] || null;
  }

  function setProfile(username, data) {
    const all = loadProfiles();
    all[username] = data;
    saveProfiles(all);
  }

  function deleteProfile(username) {
    const all = loadProfiles();
    delete all[username];
    saveProfiles(all);
  }

  // ── Session — which user is "logged in" on this browser ──
  const SESSION_KEY = "csg_session";

  function getSession() {
    return localStorage.getItem(SESSION_KEY) || null;
  }

  function setSession(username) {
    localStorage.setItem(SESSION_KEY, username);
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  // ── Utility ──
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function slugify(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function initials(name) {
    return (name || "?")
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  function avatarHTML(profile, sizeClass) {
    if (profile.image) {
      return `<div class="${sizeClass}"><img src="${escapeHTML(profile.image)}" alt="${escapeHTML(profile.name)}" onerror="this.parentNode.innerHTML='${initials(profile.name)}'"/></div>`;
    }
    return `<div class="${sizeClass}">${initials(profile.name)}</div>`;
  }

  function truncateURL(url, max) {
    try {
      const u = new URL(url);
      let display = u.hostname + u.pathname;
      if (display.endsWith("/")) display = display.slice(0, -1);
      return display.length > max ? display.slice(0, max) + "…" : display;
    } catch {
      return url.length > max ? url.slice(0, max) + "…" : url;
    }
  }

  // ── Toast ──
  function toast(message) {
    const container = document.getElementById("toastContainer");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 3000);
  }

  // ── Confirm dialog ──
  let confirmCallback = null;

  function showConfirm(title, text, onConfirm) {
    document.getElementById("confirmTitle").textContent = title;
    document.getElementById("confirmText").textContent = text;
    confirmCallback = onConfirm;
    document.getElementById("confirmModal").classList.add("active");
  }

  document.getElementById("confirmCancel").addEventListener("click", function () {
    document.getElementById("confirmModal").classList.remove("active");
    confirmCallback = null;
  });

  document.getElementById("confirmOk").addEventListener("click", function () {
    document.getElementById("confirmModal").classList.remove("active");
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });

  // ── Entry modal ──
  let entryEditUsername = null;

  function openEntryModal(entry, username) {
    entryEditUsername = username;
    document.getElementById("entryModalTitle").textContent = entry ? "Edit Content" : "Add Content";
    document.getElementById("entryModalSave").textContent = entry ? "Update" : "Add";
    document.getElementById("entryEditId").value = entry ? entry.id : "";
    document.getElementById("entryTitle").value = entry ? entry.title : "";
    document.getElementById("entryDesc").value = entry ? entry.description || "" : "";
    document.getElementById("entryLink").value = entry ? entry.link : "";
    document.getElementById("entryThumb").value = entry ? entry.thumbnail || "" : "";
    document.getElementById("entryTag").value = entry ? entry.tag || "" : "";
    document.getElementById("entryFeatured").checked = entry ? !!entry.featured : false;
    document.getElementById("entryModal").classList.add("active");
    setTimeout(() => document.getElementById("entryTitle").focus(), 100);
  }

  document.getElementById("entryModalCancel").addEventListener("click", function () {
    document.getElementById("entryModal").classList.remove("active");
  });

  document.getElementById("entryForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const username = entryEditUsername;
    if (!username) return;
    const profile = getProfile(username);
    if (!profile) return;

    const id = document.getElementById("entryEditId").value;
    const isFeatured = document.getElementById("entryFeatured").checked;

    const entryData = {
      id: id || uid(),
      title: document.getElementById("entryTitle").value.trim(),
      description: document.getElementById("entryDesc").value.trim(),
      link: document.getElementById("entryLink").value.trim(),
      thumbnail: document.getElementById("entryThumb").value.trim(),
      tag: document.getElementById("entryTag").value.trim(),
      featured: isFeatured,
    };

    if (!entryData.title || !entryData.link) return;

    // If marking as featured, unmark others
    if (isFeatured) {
      profile.entries.forEach((en) => {
        if (en.id !== entryData.id) en.featured = false;
      });
    }

    if (id) {
      const idx = profile.entries.findIndex((en) => en.id === id);
      if (idx !== -1) profile.entries[idx] = entryData;
    } else {
      profile.entries.push(entryData);
    }

    setProfile(username, profile);
    document.getElementById("entryModal").classList.remove("active");
    toast(id ? "Content updated" : "Content added");
    navigate(window.location.hash);
  });

  // Close modals on overlay click
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", function (e) {
      if (e.target === this) this.classList.remove("active");
    });
  });

  // ── Router ──
  function navigate(hash) {
    if (!hash || hash === "#" || hash === "#/") {
      renderHome();
    } else if (hash === "#/create") {
      renderCreateProfile();
    } else if (hash.startsWith("#/edit/")) {
      const username = hash.replace("#/edit/", "");
      renderEditProfile(username);
    } else if (hash.startsWith("#/")) {
      const username = hash.replace("#/", "");
      renderPublicProfile(username);
    } else {
      renderHome();
    }
  }

  function showView(id) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.getElementById(id).classList.add("active");
  }

  // ── Header actions ──
  function renderHeader() {
    const session = getSession();
    const actions = document.getElementById("headerActions");
    if (session) {
      const profile = getProfile(session);
      actions.innerHTML = `
        <a href="#/${escapeHTML(session)}" class="btn btn-ghost btn-sm">My Page</a>
        <a href="#/edit/${escapeHTML(session)}" class="btn btn-secondary btn-sm">Edit</a>
        <button class="btn btn-ghost btn-sm" id="logoutBtn">Sign Out</button>
      `;
      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
          clearSession();
          renderHeader();
          navigate("#/");
        });
      }
    } else {
      actions.innerHTML = `
        <a href="#/create" class="btn btn-primary btn-sm">Create Profile</a>
      `;
    }
  }

  // ══════════════════════════════
  //  HOME VIEW
  // ══════════════════════════════
  function renderHome() {
    showView("viewHome");
    renderHeader();
    renderProfileList("");
    document.getElementById("homeSearch").value = "";
  }

  document.getElementById("homeSearch").addEventListener("input", function () {
    renderProfileList(this.value.trim().toLowerCase());
  });

  function renderProfileList(query) {
    const wrap = document.getElementById("homeProfiles");
    const all = loadProfiles();
    const keys = Object.keys(all)
      .filter((k) => {
        if (!query) return true;
        const p = all[k];
        return (
          k.toLowerCase().includes(query) ||
          (p.name || "").toLowerCase().includes(query) ||
          (p.bio || "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => (all[b].createdAt || 0) - (all[a].createdAt || 0));

    if (keys.length === 0 && !query) {
      wrap.innerHTML = `
        <div class="empty-state">
          <p>No profiles yet. Be the first to showcase your work.</p>
          <a href="#/create" class="btn btn-primary">Create Profile</a>
        </div>
      `;
      return;
    }

    if (keys.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><p>No profiles match your search.</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <h2>Portfolios</h2>
      <div class="profile-list">
        ${keys
          .map((k) => {
            const p = all[k];
            const entryCount = (p.entries || []).length;
            return `
            <a href="#/${escapeHTML(k)}" class="profile-list-item">
              ${avatarHTML(p, "profile-list-avatar")}
              <div class="profile-list-info">
                <div class="profile-list-name">${escapeHTML(p.name)}</div>
                <div class="profile-list-bio">${escapeHTML(p.bio || (entryCount + " item" + (entryCount !== 1 ? "s" : "")))}</div>
              </div>
              <svg class="profile-list-arrow" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7"/></svg>
            </a>`;
          })
          .join("")}
      </div>
    `;
  }

  // ══════════════════════════════
  //  PUBLIC PROFILE VIEW
  // ══════════════════════════════
  function renderPublicProfile(username) {
    showView("viewProfile");
    renderHeader();
    const container = document.getElementById("profileContent");
    const profile = getProfile(username);

    if (!profile) {
      container.innerHTML = `
        <div class="profile-not-found">
          <h2>Profile not found</h2>
          <p>There's no portfolio at this address.</p>
          <a href="#/" class="btn btn-secondary">Back to Home</a>
        </div>
      `;
      return;
    }

    const entries = profile.entries || [];
    const featured = entries.find((e) => e.featured);
    const others = entries.filter((e) => !e.featured);
    const session = getSession();
    const isOwner = session === username;

    let html = `
      <div class="profile-header">
        ${avatarHTML(profile, "profile-avatar")}
        <h1 class="profile-name">${escapeHTML(profile.name)}</h1>
        <div class="profile-username">@${escapeHTML(username)}</div>
        ${profile.bio ? `<p class="profile-bio">${escapeHTML(profile.bio)}</p>` : ""}
        ${isOwner ? `<div style="margin-top:16px;"><a href="#/edit/${escapeHTML(username)}" class="btn btn-secondary btn-sm">Edit Profile</a></div>` : ""}
      </div>
    `;

    if (entries.length === 0) {
      html += `<div class="empty-state"><p>${isOwner ? "You haven't added any content yet." : "No content to show yet."}</p>${isOwner ? `<a href="#/edit/${escapeHTML(username)}" class="btn btn-primary">Add Content</a>` : ""}</div>`;
      container.innerHTML = html;
      return;
    }

    if (featured) {
      html += `
        <div style="margin-bottom:32px;">
          <div class="content-section-title">Featured</div>
          <a href="${escapeHTML(featured.link)}" target="_blank" rel="noopener noreferrer" class="featured-card" style="display:block;text-decoration:none;color:inherit;">
            ${featured.thumbnail ? `<img class="card-thumb" src="${escapeHTML(featured.thumbnail)}" alt="" onerror="this.style.display='none'" style="width:100%;height:200px;object-fit:cover;display:block;"/>` : ""}
            <div class="card-body" style="padding:20px 24px 24px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span class="featured-badge">
                  <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/></svg>
                  Featured
                </span>
                ${featured.tag ? `<span class="content-tag">${escapeHTML(featured.tag)}</span>` : ""}
              </div>
              <div style="font-weight:600;font-size:1.0625rem;margin-bottom:4px;">${escapeHTML(featured.title)}</div>
              ${featured.description ? `<div style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:8px;">${escapeHTML(featured.description)}</div>` : ""}
              <div class="content-card-link">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
                ${escapeHTML(truncateURL(featured.link, 40))}
              </div>
            </div>
          </a>
        </div>
      `;
    }

    if (others.length > 0) {
      html += `
        <div>
          ${entries.length > 1 || !featured ? `<div class="content-section-title">${featured ? "More Work" : "Work"}</div>` : ""}
          <div class="content-grid">
            ${others
              .map(
                (entry) => `
              <a href="${escapeHTML(entry.link)}" target="_blank" rel="noopener noreferrer" class="content-card">
                ${entry.thumbnail ? `<img class="content-card-thumb" src="${escapeHTML(entry.thumbnail)}" alt="" onerror="this.style.display='none'" />` : ""}
                <div class="content-card-body">
                  <div class="content-card-title">${escapeHTML(entry.title)}</div>
                  ${entry.description ? `<div class="content-card-desc">${escapeHTML(entry.description)}</div>` : ""}
                  <div class="content-card-meta">
                    ${entry.tag ? `<span class="content-tag">${escapeHTML(entry.tag)}</span>` : ""}
                    <span class="content-card-link">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
                      ${escapeHTML(truncateURL(entry.link, 35))}
                    </span>
                  </div>
                </div>
              </a>`
              )
              .join("")}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  // ══════════════════════════════
  //  CREATE PROFILE VIEW
  // ══════════════════════════════
  function renderCreateProfile() {
    const session = getSession();
    if (session) {
      window.location.hash = "#/edit/" + session;
      return;
    }
    showView("viewEdit");
    renderHeader();
    const container = document.getElementById("editContent");

    container.innerHTML = `
      <div class="edit-section">
        <h1 class="edit-section-title">Create Your Portfolio</h1>
        <p class="edit-section-subtitle">Set up your public proof-of-work page.</p>
        <form id="createForm">
          <div class="form-group">
            <label class="form-label" for="createUsername">Username</label>
            <input type="text" class="form-input" id="createUsername" placeholder="e.g. janedoe" required pattern="[a-z0-9\\-]+" />
            <div class="form-hint">Lowercase letters, numbers, and hyphens only. This becomes your public URL.</div>
          </div>
          <div class="form-group">
            <label class="form-label" for="createName">Display Name</label>
            <input type="text" class="form-input" id="createName" placeholder="e.g. Jane Doe" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="createBio">Short Bio <span style="font-weight:400;color:var(--text-tertiary)">(optional)</span></label>
            <textarea class="form-textarea" id="createBio" rows="2" placeholder="What do you do?"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="createImage">Profile Image URL <span style="font-weight:400;color:var(--text-tertiary)">(optional)</span></label>
            <input type="url" class="form-input" id="createImage" placeholder="https://..." />
          </div>
          <div style="display:flex;gap:10px;margin-top:8px;">
            <button type="submit" class="btn btn-primary">Create Profile</button>
            <a href="#/" class="btn btn-secondary">Cancel</a>
          </div>
        </form>
      </div>
    `;

    // Auto-slugify username
    document.getElementById("createUsername").addEventListener("input", function () {
      this.value = slugify(this.value);
    });

    document.getElementById("createForm").addEventListener("submit", function (e) {
      e.preventDefault();
      const username = document.getElementById("createUsername").value.trim();
      const name = document.getElementById("createName").value.trim();
      const bio = document.getElementById("createBio").value.trim();
      const image = document.getElementById("createImage").value.trim();

      if (!username || !name) return;

      if (getProfile(username)) {
        toast("Username already taken. Choose another.");
        return;
      }

      const profile = {
        name: name,
        bio: bio,
        image: image,
        entries: [],
        createdAt: Date.now(),
      };

      setProfile(username, profile);
      setSession(username);
      renderHeader();
      toast("Profile created!");
      window.location.hash = "#/edit/" + username;
    });
  }

  // ══════════════════════════════
  //  EDIT PROFILE VIEW
  // ══════════════════════════════
  function renderEditProfile(username) {
    showView("viewEdit");
    renderHeader();
    const container = document.getElementById("editContent");
    const session = getSession();

    if (session !== username) {
      container.innerHTML = `
        <div class="profile-not-found">
          <h2>Access denied</h2>
          <p>You can only edit your own profile.</p>
          <a href="#/" class="btn btn-secondary">Back to Home</a>
        </div>
      `;
      return;
    }

    const profile = getProfile(username);
    if (!profile) {
      container.innerHTML = `
        <div class="profile-not-found">
          <h2>Profile not found</h2>
          <p>This profile does not exist.</p>
          <a href="#/" class="btn btn-secondary">Back to Home</a>
        </div>
      `;
      return;
    }

    const entries = profile.entries || [];

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px;">
        <h1 class="edit-section-title" style="margin-bottom:0;">Edit Portfolio</h1>
        <a href="#/${escapeHTML(username)}" class="btn btn-secondary btn-sm">View Public Page</a>
      </div>

      <!-- Profile Section -->
      <div class="card" style="margin-bottom:28px;">
        <h2 style="font-size:0.9375rem;font-weight:700;margin-bottom:16px;">Profile Info</h2>
        <form id="profileForm">
          <div class="avatar-upload">
            ${avatarHTML(profile, "avatar-preview")}
            <div>
              <input type="url" class="form-input" id="editImage" placeholder="Profile image URL" value="${escapeHTML(profile.image || "")}" style="font-size:0.8125rem;padding:6px 10px;" />
              <div class="form-hint">Paste an image URL for your avatar</div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="editName">Display Name</label>
              <input type="text" class="form-input" id="editName" value="${escapeHTML(profile.name)}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Username</label>
              <input type="text" class="form-input" value="${escapeHTML(username)}" disabled style="background:var(--bg);color:var(--text-tertiary);" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="editBio">Short Bio</label>
            <textarea class="form-textarea" id="editBio" rows="2">${escapeHTML(profile.bio || "")}</textarea>
          </div>
          <div style="display:flex;gap:10px;">
            <button type="submit" class="btn btn-primary btn-sm">Save Changes</button>
          </div>
        </form>
      </div>

      <!-- Content Section -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
          <h2 style="font-size:0.9375rem;font-weight:700;margin:0;">Content Entries</h2>
          <button class="btn btn-primary btn-sm" id="addEntryBtn">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            Add Content
          </button>
        </div>
        ${
          entries.length === 0
            ? `<div class="empty-state" style="padding:28px 16px;"><p>No content yet. Add your first piece of work.</p></div>`
            : `<div class="entries-list" id="entriesList">
                ${entries
                  .map(
                    (entry) => `
                  <div class="entry-item${entry.featured ? " is-featured" : ""}" data-id="${escapeHTML(entry.id)}">
                    <div class="entry-item-body">
                      <div class="entry-item-title">
                        ${entry.featured ? '<svg width="12" height="12" fill="var(--accent)" viewBox="0 0 24 24" style="vertical-align:-1px;margin-right:4px;"><path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/></svg>' : ""}
                        ${escapeHTML(entry.title)}
                        ${entry.tag ? `<span class="content-tag" style="margin-left:6px;vertical-align:1px;">${escapeHTML(entry.tag)}</span>` : ""}
                      </div>
                      <div class="entry-item-link">${escapeHTML(truncateURL(entry.link, 50))}</div>
                    </div>
                    <div class="entry-item-actions">
                      <button class="btn btn-ghost btn-icon edit-entry-btn" data-id="${escapeHTML(entry.id)}" title="Edit">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"/></svg>
                      </button>
                      <button class="btn btn-ghost btn-icon delete-entry-btn" data-id="${escapeHTML(entry.id)}" title="Delete">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
                      </button>
                    </div>
                  </div>`
                  )
                  .join("")}
              </div>`
        }
      </div>

      <!-- Danger Zone -->
      <div style="margin-top:36px;padding-top:24px;border-top:1px solid var(--border);">
        <button class="btn btn-ghost btn-sm" style="color:var(--danger);" id="deleteProfileBtn">Delete Profile</button>
      </div>
    `;

    // ── Profile form save ──
    document.getElementById("profileForm").addEventListener("submit", function (e) {
      e.preventDefault();
      const updated = getProfile(username);
      if (!updated) return;
      updated.name = document.getElementById("editName").value.trim();
      updated.bio = document.getElementById("editBio").value.trim();
      updated.image = document.getElementById("editImage").value.trim();
      setProfile(username, updated);
      toast("Profile saved");
      renderEditProfile(username);
    });

    // ── Add entry button ──
    document.getElementById("addEntryBtn").addEventListener("click", function () {
      openEntryModal(null, username);
    });

    // ── Edit entry buttons ──
    container.querySelectorAll(".edit-entry-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = this.getAttribute("data-id");
        const p = getProfile(username);
        if (!p) return;
        const entry = p.entries.find((en) => en.id === id);
        if (entry) openEntryModal(entry, username);
      });
    });

    // ── Delete entry buttons ──
    container.querySelectorAll(".delete-entry-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = this.getAttribute("data-id");
        showConfirm("Delete Content", "Are you sure? This action cannot be undone.", function () {
          const p = getProfile(username);
          if (!p) return;
          p.entries = p.entries.filter((en) => en.id !== id);
          setProfile(username, p);
          toast("Content deleted");
          renderEditProfile(username);
        });
      });
    });

    // ── Delete profile ──
    document.getElementById("deleteProfileBtn").addEventListener("click", function () {
      showConfirm("Delete Profile", "This will permanently delete your profile and all content. Are you sure?", function () {
        deleteProfile(username);
        clearSession();
        renderHeader();
        toast("Profile deleted");
        window.location.hash = "#/";
      });
    });
  }

  // ── Init ──
  window.addEventListener("hashchange", function () {
    navigate(window.location.hash);
  });

  navigate(window.location.hash);
})();