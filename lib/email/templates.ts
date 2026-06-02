const BASE_URL = "https://bright-crm-three.vercel.app";

function taskUrl(taskId: string) {
  return `${BASE_URL}/tasks?task=${taskId}&assignee=__all__`;
}

function wrap(body: string) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"></head>
<body style="direction:rtl;text-align:right;font-family:Heebo,Arial,sans-serif;background:#f7f7f8;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e0e0e6;">
${body}
</div>
<div style="max-width:600px;margin:12px auto 0;text-align:center;color:#999;font-size:12px;">
BrightCRM — ניהול משימות לצוות Bright
</div>
</body>
</html>`;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    "מחכה לטיפול": "#FFD02F",
    "נכנס לעבודה": "#DCE4FF",
    "בעבודה": "#4262FF",
    "אישור לקוח": "#EDE0FF",
    "בוצע": "#D0F0E8",
  };
  const textColors: Record<string, string> = {
    "בעבודה": "#fff",
  };
  const bg = colors[status] || "#E0E0E6";
  const color = textColors[status] || "#050038";
  return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;background:${bg};color:${color};font-size:13px;">${status}</span>`;
}

type TaskInfo = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  description?: string | null;
};

type ClientInfo = {
  name: string;
};

type PersonInfo = {
  full_name: string;
};

export function newTaskEmail(
  task: TaskInfo,
  client: ClientInfo,
  assignees: PersonInfo[],
  createdBy: PersonInfo,
) {
  const dueText = task.due_date || "לא צוין";
  const assigneeNames = assignees.map((a) => a.full_name).join(", ");

  const body = `
<h2 style="color:#050038;margin:0 0 16px;">משימה חדשה</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px;">
  <tr><td style="padding:8px 0;color:#666;width:100px;">משימה:</td><td style="padding:8px 0;font-weight:600;">${task.title}</td></tr>
  <tr><td style="padding:8px 0;color:#666;">לקוח:</td><td style="padding:8px 0;">${client.name}</td></tr>
  <tr><td style="padding:8px 0;color:#666;">נפתחה ע"י:</td><td style="padding:8px 0;">${createdBy.full_name}</td></tr>
  <tr><td style="padding:8px 0;color:#666;">אחראים:</td><td style="padding:8px 0;">${assigneeNames}</td></tr>
  <tr><td style="padding:8px 0;color:#666;">דדליין:</td><td style="padding:8px 0;">${dueText}</td></tr>
  ${task.description ? `<tr><td style="padding:8px 0;color:#666;">תיאור:</td><td style="padding:8px 0;">${task.description}</td></tr>` : ""}
</table>
<div style="margin-top:20px;">
  <a href="${taskUrl(task.id)}" style="display:inline-block;padding:10px 24px;background:#4262FF;color:#fff;text-decoration:none;border-radius:20px;font-size:14px;">פתח משימה</a>
</div>`;

  return {
    subject: `משימה חדשה: ${task.title}`,
    html: wrap(body),
  };
}

export function newCommentEmail(
  task: TaskInfo,
  client: ClientInfo,
  comment: { content: string },
  author: PersonInfo,
) {
  const body = `
<h2 style="color:#050038;margin:0 0 16px;">תגובה חדשה</h2>
<p style="color:#666;font-size:14px;margin:0 0 8px;">משימה: <strong>${task.title}</strong> (${client.name})</p>
<div style="background:#f7f7f8;border-radius:8px;padding:12px 16px;margin:12px 0;font-size:14px;">
  <strong>${author.full_name}:</strong><br/>
  ${comment.content}
</div>
<div style="margin-top:20px;">
  <a href="${taskUrl(task.id)}" style="display:inline-block;padding:10px 24px;background:#4262FF;color:#fff;text-decoration:none;border-radius:20px;font-size:14px;">פתח משימה</a>
</div>`;

  return {
    subject: `תגובה חדשה במשימה: ${task.title}`,
    html: wrap(body),
  };
}

export function mentionEmail(
  task: TaskInfo,
  client: ClientInfo,
  comment: { content: string },
  author: PersonInfo,
  mentionedUser: PersonInfo,
) {
  const body = `
<h2 style="color:#050038;margin:0 0 16px;">תויגת במשימה</h2>
<p style="color:#666;font-size:14px;margin:0 0 8px;">${mentionedUser.full_name}, ${author.full_name} תייג/ה אותך בתגובה.</p>
<p style="color:#666;font-size:14px;margin:0 0 8px;">משימה: <strong>${task.title}</strong> (${client.name})</p>
<div style="background:#f7f7f8;border-radius:8px;padding:12px 16px;margin:12px 0;font-size:14px;">
  <strong>${author.full_name}:</strong><br/>
  ${comment.content}
</div>
<div style="margin-top:20px;">
  <a href="${taskUrl(task.id)}" style="display:inline-block;padding:10px 24px;background:#4262FF;color:#fff;text-decoration:none;border-radius:20px;font-size:14px;">פתח משימה</a>
</div>`;

  return {
    subject: `תויגת במשימה: ${task.title}`,
    html: wrap(body),
  };
}

export function overdueEmail(
  task: TaskInfo,
  client: ClientInfo,
  assignees: PersonInfo[],
) {
  const dueDate = task.due_date || "";
  const daysOverdue = dueDate
    ? Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000)
    : 0;

  const body = `
<h2 style="color:#D32F2F;margin:0 0 16px;">משימה עברה דדליין</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px;">
  <tr><td style="padding:8px 0;color:#666;width:100px;">משימה:</td><td style="padding:8px 0;font-weight:600;">${task.title}</td></tr>
  <tr><td style="padding:8px 0;color:#666;">לקוח:</td><td style="padding:8px 0;">${client.name}</td></tr>
  <tr><td style="padding:8px 0;color:#666;">דדליין:</td><td style="padding:8px 0;color:#D32F2F;font-weight:600;">${dueDate}</td></tr>
  <tr><td style="padding:8px 0;color:#666;">איחור:</td><td style="padding:8px 0;color:#D32F2F;">${daysOverdue} ימים</td></tr>
  <tr><td style="padding:8px 0;color:#666;">סטטוס:</td><td style="padding:8px 0;">${statusBadge(task.status)}</td></tr>
</table>
<div style="margin-top:20px;">
  <a href="${taskUrl(task.id)}" style="display:inline-block;padding:10px 24px;background:#D32F2F;color:#fff;text-decoration:none;border-radius:20px;font-size:14px;">טפל במשימה</a>
</div>`;

  return {
    subject: `משימה עברה דדליין: ${task.title}`,
    html: wrap(body),
  };
}

type DigestTask = {
  id: string;
  title: string;
  client_name: string;
  due_date: string | null;
  status: string;
};

export function morningDigestEmail(
  member: PersonInfo,
  openTasks: DigestTask[],
  overdueTasks: DigestTask[],
  todayTasks: DigestTask[],
) {
  const today = new Date().toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  function taskRow(t: DigestTask) {
    const dueText = t.due_date || "-";
    const isOverdue = t.due_date && new Date(t.due_date) < new Date(new Date().toISOString().slice(0, 10));
    const dueStyle = isOverdue ? "color:#D32F2F;font-weight:600;" : "";
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;"><a href="${taskUrl(t.id)}" style="color:#4262FF;text-decoration:none;">${t.title}</a></td>
      <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${t.client_name}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;${dueStyle}">${dueText}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${statusBadge(t.status)}</td>
    </tr>`;
  }

  let sections = "";

  if (overdueTasks.length > 0) {
    sections += `
<h3 style="color:#D32F2F;margin:20px 0 8px;">עברו דדליין (${overdueTasks.length})</h3>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
  <tr style="background:#f7f7f8;"><th style="padding:8px;text-align:right;">משימה</th><th style="padding:8px;text-align:right;">לקוח</th><th style="padding:8px;text-align:right;">דדליין</th><th style="padding:8px;text-align:right;">סטטוס</th></tr>
  ${overdueTasks.map(taskRow).join("")}
</table>`;
  }

  if (todayTasks.length > 0) {
    sections += `
<h3 style="color:#050038;margin:20px 0 8px;">דדליין היום (${todayTasks.length})</h3>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
  <tr style="background:#f7f7f8;"><th style="padding:8px;text-align:right;">משימה</th><th style="padding:8px;text-align:right;">לקוח</th><th style="padding:8px;text-align:right;">דדליין</th><th style="padding:8px;text-align:right;">סטטוס</th></tr>
  ${todayTasks.map(taskRow).join("")}
</table>`;
  }

  if (openTasks.length > 0) {
    sections += `
<h3 style="color:#050038;margin:20px 0 8px;">משימות פתוחות (${openTasks.length})</h3>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
  <tr style="background:#f7f7f8;"><th style="padding:8px;text-align:right;">משימה</th><th style="padding:8px;text-align:right;">לקוח</th><th style="padding:8px;text-align:right;">דדליין</th><th style="padding:8px;text-align:right;">סטטוס</th></tr>
  ${openTasks.map(taskRow).join("")}
</table>`;
  }

  const body = `
<h2 style="color:#050038;margin:0 0 4px;">בוקר טוב, ${member.full_name}</h2>
<p style="color:#666;font-size:14px;margin:0 0 16px;">${today}</p>
${sections || '<p style="color:#666;font-size:14px;">אין משימות פתוחות. יום שקט!</p>'}
<div style="margin-top:20px;">
  <a href="${BASE_URL}/tasks" style="display:inline-block;padding:10px 24px;background:#4262FF;color:#fff;text-decoration:none;border-radius:20px;font-size:14px;">כל המשימות</a>
</div>`;

  return {
    subject: `סיכום בוקר — ${today}`,
    html: wrap(body),
  };
}
