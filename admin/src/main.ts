import {
  acceptInvite,
  getUser,
  handleAuthCallback,
  login,
  logout,
  onAuthChange,
  updateUser,
} from "@netlify/identity";

import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("管理画面の表示先が見つかりません");
}

function renderLogin(message = "") {
  app.innerHTML = `
    <main class="admin-shell">
      <header class="admin-header">
        <div>
          <p class="admin-brand">DIVERRA</p>
          <p class="admin-subtitle">Editorial Admin</p>
        </div>
      </header>

      <section class="panel">
        <h1>管理画面へログイン</h1>
        <p>DIVIさん専用の記事管理画面です。</p>

        <form id="login-form">
          <div class="field">
            <label for="email">メールアドレス</label>
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
            >
          </div>

          <div class="field">
            <label for="password">パスワード</label>
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
            >
          </div>

          <div class="actions">
            <button class="button button-primary" type="submit">
              ログイン
            </button>
          </div>

          <p id="login-status" class="status ${
            message ? "error" : ""
          }">${message}</p>
        </form>
      </section>
    </main>
  `;

  const form = document.querySelector<HTMLFormElement>("#login-form");
  const status =
    document.querySelector<HTMLParagraphElement>("#login-status");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const email = String(data.get("email") || "");
    const password = String(data.get("password") || "");

    if (status) {
      status.classList.remove("error");
      status.textContent = "ログインしています。";
    }

    try {
      await login(email, password);
      renderEditor();
    } catch (error) {
      console.error(error);

      if (status) {
        status.classList.add("error");
        status.textContent =
          "ログインできませんでした。入力内容をご確認ください。";
      }
    }
  });
}


function renderInvite(token: string) {
  app.innerHTML = `
    <main class="admin-shell">
      <header class="admin-header">
        <div>
          <p class="admin-brand">DIVERRA</p>
          <p class="admin-subtitle">Editorial Admin</p>
        </div>
      </header>

      <section class="panel">
        <h1>パスワードを設定</h1>
        <p>管理画面で使用するパスワードを設定してください。</p>

        <form id="invite-form">
          <div class="field">
            <label for="new-password">新しいパスワード</label>
            <input
              id="new-password"
              name="password"
              type="password"
              minlength="8"
              autocomplete="new-password"
              required
            >
          </div>

          <div class="field">
            <label for="confirm-password">パスワード確認</label>
            <input
              id="confirm-password"
              name="confirmation"
              type="password"
              minlength="8"
              autocomplete="new-password"
              required
            >
          </div>

          <div class="actions">
            <button class="button button-primary" type="submit">
              パスワードを設定
            </button>
          </div>

          <p id="invite-status" class="status"></p>
        </form>
      </section>
    </main>
  `;

  const form =
    document.querySelector<HTMLFormElement>("#invite-form");
  const status =
    document.querySelector<HTMLParagraphElement>("#invite-status");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const password = String(data.get("password") || "");
    const confirmation =
      String(data.get("confirmation") || "");

    if (password !== confirmation) {
      if (status) {
        status.classList.add("error");
        status.textContent = "パスワードが一致していません。";
      }

      return;
    }

    if (status) {
      status.classList.remove("error");
      status.textContent = "アカウントを設定しています。";
    }

    try {
      await acceptInvite(token, password);
      renderEditor();
    } catch (error) {
      console.error(error);

      if (status) {
        status.classList.add("error");
        status.textContent =
          "設定できませんでした。招待リンクを再度ご確認ください。";
      }
    }
  });
}


function renderRecovery() {
  if (!app) return;

  app.innerHTML = `
    <main class="auth-shell">
      <section class="panel auth-panel">
        <p class="eyebrow">Editorial Admin</p>
        <h1>新しいパスワードを設定</h1>
        <p>今後ログインに使用するパスワードを入力してください。</p>

        <form id="recovery-form">
          <div class="field">
            <label for="new-password">新しいパスワード</label>
            <input id="new-password" type="password" minlength="8" required>
          </div>

          <div class="field">
            <label for="confirm-password">パスワードを再入力</label>
            <input id="confirm-password" type="password" minlength="8" required>
          </div>

          <p id="recovery-message" class="form-message" aria-live="polite"></p>

          <button type="submit">パスワードを設定</button>
        </form>
      </section>
    </main>
  `;

  const form = document.querySelector<HTMLFormElement>("#recovery-form");
  const message =
    document.querySelector<HTMLParagraphElement>("#recovery-message");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password =
      document.querySelector<HTMLInputElement>("#new-password")?.value ?? "";
    const confirmation =
      document.querySelector<HTMLInputElement>("#confirm-password")?.value ?? "";

    if (password !== confirmation) {
      if (message) message.textContent = "パスワードが一致していません。";
      return;
    }

    try {
      await updateUser({ password });
      renderEditor();
    } catch (error) {
      console.error("パスワード更新エラー", error);
      if (message) {
        message.textContent =
          error instanceof Error
            ? `更新エラー：${error.message}`
            : "パスワードを更新できませんでした。";
      }
    }
  });
}

function renderEditor() {
  app.innerHTML = `
    <main class="admin-shell">
      <header class="admin-header">
        <div>
          <p class="admin-brand">DIVERRA</p>
          <p class="admin-subtitle">Editorial Admin</p>
        </div>

        <button
          id="logout-button"
          class="button button-small"
          type="button"
        >
          ログアウト
        </button>
      </header>

      <section class="panel">
        <h1>新しい記事</h1>
        <p>
          記事内容を確認し、問題がなければ公開します。
        </p>

        <form id="article-form">
          <div class="field">
            <label for="title">記事タイトル</label>
            <input id="title" name="title" type="text" required>
          </div>

          <div class="field">
            <label for="description">短い説明文</label>
            <textarea
              id="description"
              name="description"
              rows="3"
              required
            ></textarea>
          </div>

          <div class="field">
            <label for="category">カテゴリー</label>
            <select id="category" name="category" required>
              <option value="">選択してください</option>
              <option value="THAILAND">タイ</option>
              <option value="KOREA">韓国</option>
              <option value="TAIWAN">台湾</option>
              <option value="TRAVEL">旅行全般</option>
            </select>
          </div>

          <div class="field">
            <label for="thumbnail">サムネイル</label>
            <input
              id="thumbnail"
              name="thumbnail"
              type="file"
              accept="image/png,image/jpeg,image/webp"
            >
          </div>

          <div class="field">
            <label for="body">記事本文</label>
            <textarea id="body" name="body" required></textarea>
          </div>

          <div class="actions">
            <button class="button" type="button" id="draft-button">
              下書き保存
            </button>

            <button
              class="button button-primary"
              type="button"
              id="publish-button"
            >
              公開前確認
            </button>
          </div>

          <p id="article-status" class="status">
            公開処理は次の工程で接続します。
          </p>
        </form>
      </section>
    </main>
  `;

  document
    .querySelector<HTMLButtonElement>("#logout-button")
    ?.addEventListener("click", async () => {
      await logout();
      renderLogin();
    });

  const status =
    document.querySelector<HTMLParagraphElement>("#article-status");

  document
    .querySelector<HTMLButtonElement>("#draft-button")
    ?.addEventListener("click", async () => {
      const form =
        document.querySelector<HTMLFormElement>("#article-form");
      const button =
        document.querySelector<HTMLButtonElement>("#draft-button");

      if (!form || !form.reportValidity()) return;

      const title =
        document.querySelector<HTMLInputElement>("#title")?.value ?? "";
      const description =
        document.querySelector<HTMLTextAreaElement>("#description")?.value ?? "";
      const category =
        document.querySelector<HTMLSelectElement>("#category")?.value ?? "";
      const body =
        document.querySelector<HTMLTextAreaElement>("#body")?.value ?? "";

      if (button) button.disabled = true;
      if (status) status.textContent = "下書きを保存しています…";

      try {
        const response = await fetch("/api/save-draft", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            description,
            category,
            body,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.ok) {
          throw new Error(result.message ?? "保存に失敗しました");
        }

        if (status) {
          status.textContent =
            "下書きを検証用ブランチへ保存しました。公開サイトは変更していません。";
        }
      } catch (error) {
        console.error("下書き保存エラー", error);
        if (status) {
          status.textContent =
            error instanceof Error
              ? `保存エラー：${error.message}`
              : "下書きを保存できませんでした。";
        }
      } finally {
        if (button) button.disabled = false;
      }
    });

  document
    .querySelector<HTMLButtonElement>("#publish-button")
    ?.addEventListener("click", () => {
      if (status) {
        status.textContent =
          "公開前確認画面は次の工程で接続します。";
      }
    });
}

async function start() {
  let authResult = null;

  try {
    authResult = await handleAuthCallback();
  } catch (error) {
    console.error("認証処理エラー", error);
  }

  if (
    authResult?.type === "invite" &&
    authResult.token
  ) {
    renderInvite(authResult.token);
    return;
  }

  if (authResult?.type === "recovery") {
    renderRecovery();
    return;
  }

  const user = await getUser();

  if (user) {
    renderEditor();
  } else {
    renderLogin();
  }

  onAuthChange((_event, currentUser) => {
    if (currentUser) {
      renderEditor();
    } else {
      renderLogin();
    }
  });
}

start();
