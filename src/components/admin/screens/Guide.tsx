'use client';

import Link from 'next/link';

import { AdminPageHeader } from '@/components/admin/AdminShell';
import { useAdmin } from '@/components/admin/AdminProviders';

/* ------------------------------------------------------------------------ *
 | Shared "what can this person do" vocabulary
 |
 | Used by the dashboard's "My access" card, the staff list and this guide,
 | so the same permission is always described in the same words. The API is
 | still the authority: these phrases only describe what it will allow.
 * ------------------------------------------------------------------------ */

export type AccessItem = { key: string; label: string; icon: string; href?: string };

const ACCESS_RULES: { any: string[]; label: string; icon: string; href?: string }[] = [
  { any: ['branch.all'], label: 'See every branch', icon: 'las la-globe-africa', href: '/admin/branches' },
  { any: ['pos.sell'], label: 'Sell at the counter', icon: 'las la-cash-register', href: '/admin/pos' },
  { any: ['pos.discount'], label: 'Give discounts at the counter', icon: 'las la-percent' },
  { any: ['order.update_status'], label: 'Handle online orders', icon: 'las la-shopping-cart', href: '/admin/orders' },
  { any: ['inventory.receive'], label: 'Receive stock', icon: 'las la-dolly', href: '/admin/inventory/receive' },
  { any: ['inventory.transfer'], label: 'Move stock between branches', icon: 'las la-exchange-alt', href: '/admin/inventory/transfers' },
  { any: ['inventory.adjust'], label: 'Correct stock counts', icon: 'las la-clipboard-check', href: '/admin/inventory' },
  { any: ['staff.create'], label: 'Add staff below your rank', icon: 'las la-user-plus', href: '/admin/staff' },
  { any: ['role.manage'], label: 'Create and edit roles', icon: 'las la-user-tag', href: '/admin/staff/roles' },
  { any: ['product.create', 'product.update'], label: 'Add and edit products', icon: 'las la-boxes', href: '/admin/products' },
  { any: ['branch.create', 'branch.update'], label: 'Open and run branches', icon: 'las la-store', href: '/admin/branches' },
  { any: ['customer.view'], label: 'Look up customers', icon: 'las la-users', href: '/admin/customers' },
  { any: ['commission.view_all'], label: "See the team's commission", icon: 'las la-hand-holding-usd', href: '/admin/commissions' },
  { any: ['report.sales', 'report.inventory', 'report.branch_performance'], label: 'Read sales and stock reports', icon: 'las la-chart-bar', href: '/admin/reports/sales' },
  { any: ['coupon.manage', 'offer.manage', 'campaign.manage'], label: 'Run promotions', icon: 'las la-bullhorn' },
  { any: ['ticket.reply'], label: 'Answer support tickets', icon: 'las la-headset', href: '/admin/tickets' },
  { any: ['setting.general', 'setting.company'], label: 'Change store settings', icon: 'las la-cog' },
  { any: ['setting.system'], label: 'Configure the system', icon: 'las la-server' },
];

/** Plain-language list of what a set of permissions lets someone do. */
export function describeAccess(permissions: string[], everything = false): AccessItem[] {
  const held = new Set(permissions);

  return ACCESS_RULES.filter((rule) => everything || rule.any.some((name) => held.has(name))).map((rule) => ({
    key: rule.any[0],
    label: rule.label,
    icon: rule.icon,
    href: rule.href,
  }));
}

/** The roles VIPURI ships with — mirrors backend App\Constants\Roles. */
export const BUILT_IN_ROLES = [
  {
    name: 'Super Admin',
    level: 100,
    companyWide: true,
    summary: 'Owns the system: every permission and every branch. The only role that can create another super admin, and the only one that can change system configuration, payment gateways and extensions.',
  },
  {
    name: 'Admin',
    level: 90,
    companyWide: true,
    summary: 'Runs the business across all branches — catalogue, stock, orders, staff, roles and reports. Everything except system configuration, and cannot touch super admins.',
  },
  {
    name: 'Branch Manager',
    level: 60,
    companyWide: false,
    summary: "Runs one branch: its orders, stock (receiving, counts and transfers), counter sales, the branch's reports and commission, and staff below manager level.",
  },
  {
    name: 'HR Officer',
    level: 50,
    companyWide: false,
    summary: 'Looks after people in one branch: adds staff, updates their details, resets passwords and deactivates accounts — only for roles ranked below HR.',
  },
  {
    name: 'Sales Assistant',
    level: 20,
    companyWide: false,
    summary: 'Serves customers in one branch: sells at the counter, handles online orders, checks stock and sees their own commission.',
  },
  {
    name: 'Branch Worker',
    level: 20,
    companyWide: false,
    summary: 'Fulfils orders in one branch: picks, dispatches and delivers, and keeps stock counts right.',
  },
] as const;

/* ------------------------------------------------------------------------ */

const SECTIONS = [
  { id: 'sign-in', label: 'Signing in', icon: 'las la-sign-in-alt' },
  { id: 'roles', label: 'Roles and ranks', icon: 'las la-layer-group' },
  { id: 'branches', label: 'Branches', icon: 'las la-store' },
  { id: 'add-staff', label: 'Adding staff', icon: 'las la-user-plus' },
  { id: 'custom-roles', label: 'Custom roles', icon: 'las la-user-tag' },
  { id: 'selling', label: 'Counter sales and orders', icon: 'las la-cash-register' },
  { id: 'stock', label: 'Receiving stock', icon: 'las la-dolly' },
  { id: 'reports', label: 'Reports', icon: 'las la-chart-bar' },
];

function Section({ id, icon, title, children }: { id: string; icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card box-shadow3 vp-guide-section" id={id} aria-labelledby={`${id}-title`}>
      <div className="card-body">
        <h5 className="vp-guide-section__title" id={`${id}-title`}>
          <span className="vp-guide-section__icon">
            <i className={icon} aria-hidden="true" />
          </span>
          {title}
        </h5>
        {children}
      </div>
    </section>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="vp-guide-steps">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ol>
  );
}

function Tip({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <div className={`vp-guide-tip vp-guide-tip--${tone}`}>
      <i className={tone === 'warn' ? 'las la-exclamation-triangle' : 'las la-lightbulb'} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

/** A link that only renders as a link for staff who can open the page. */
function PageLink({ href, permission, children }: { href: string; permission?: string; children: React.ReactNode }) {
  const { can } = useAdmin();

  if (permission && !can(permission)) {
    return <strong>{children}</strong>;
  }

  return <Link href={href}>{children}</Link>;
}

/**
 * The in-app staff guide: how VIPURI's roles, branches, counter sales and
 * stock receiving fit together, written for the person reading it — their
 * own role is highlighted wherever it appears.
 */
export function GuideScreen() {
  const { admin, can, isSuperAdmin, isCompanyWide, roleLevel } = useAdmin();

  const myRole = admin?.role ?? null;
  const builtIn = BUILT_IN_ROLES.some((role) => role.name === myRole);
  const access = describeAccess(admin?.permissions ?? [], isSuperAdmin);

  return (
    <>
      <AdminPageHeader title="Staff Guide" />

      <div className="vp-guide-hero card box-shadow3">
        <div className="card-body">
          <div className="vp-guide-hero__text">
            <span className="vp-guide-hero__eyebrow">How VIPURI works for staff</span>
            <h4 className="vp-guide-hero__title">Hi {admin?.name?.split(' ')[0] ?? 'there'} — here is everything your role lets you do, and how.</h4>
            <p className="mb-0">
              You are signed in as <strong>{myRole ?? 'staff'}</strong>
              {roleLevel > 0 && <> (rank {roleLevel})</>}, working in{' '}
              <strong>{isCompanyWide ? 'all branches' : admin?.branch?.name ?? 'your branch'}</strong>.
            </p>
          </div>
          {access.length > 0 && (
            <ul className="vp-access-list vp-access-list--compact" aria-label="What you can do">
              {access.slice(0, 8).map((item) => (
                <li key={item.key}>
                  <i className={item.icon} aria-hidden="true" /> {item.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="vp-guide">
        <nav className="vp-guide__toc" aria-label="Guide contents">
          <span className="vp-guide__toc-title">On this page</span>
          <ul>
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>
                  <i className={section.icon} aria-hidden="true" /> {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="vp-guide__body">
          <Section id="sign-in" icon="las la-sign-in-alt" title="Signing in">
            <p>
              Everyone who works for VIPURI — super admins, admins, branch managers, HR officers, sales assistants and
              branch workers — signs in at the same place: <code>/admin/login</code>.
            </p>
            <Steps
              items={[
                <>Open <strong>/admin/login</strong> on any computer or phone.</>,
                <>Enter <strong>your own username or e-mail</strong> and your password. Never share an account — every sale, stock movement and change is recorded against the person signed in.</>,
                <>The menu on the left only shows what your role allows. If something you need is missing, ask someone ranked above you.</>,
              ]}
            />
            <Tip>
              Customers do not use this page. They sign in on the shop with <strong>Login</strong> at the top of the
              storefront. A staff account cannot be used to shop, and a customer account cannot open the admin panel.
            </Tip>
            <Tip tone="warn">
              Forgot your password? Use <strong>Forgot password</strong> on the sign-in page, or ask your manager or HR
              to set a new one. Passwords need at least 8 characters with upper-case, lower-case and a number.
            </Tip>
          </Section>

          <Section id="roles" icon="las la-layer-group" title="Roles and ranks">
            <p>
              Every staff member has one role, and every role has a <strong>rank</strong> from 1 to 100. The rank decides
              who can manage whom:
            </p>
            <div className="vp-guide-rule">
              <i className="las la-level-down-alt" aria-hidden="true" />
              <div>
                <strong>You can only add, edit or deactivate people ranked below you</strong> — and, unless your role
                covers all branches, only inside your own branch. Nobody can change their own role, and only a super admin
                can create another super admin.
              </div>
            </div>

            <ol className="vp-ladder">
              {BUILT_IN_ROLES.map((role) => {
                const mine = role.name === myRole;

                return (
                  <li className={`vp-ladder__step${mine ? ' is-mine' : ''}`} key={role.name}>
                    <span className="vp-ladder__rank" aria-label={`Rank ${role.level}`}>
                      {role.level}
                    </span>
                    <div className="vp-ladder__body">
                      <div className="vp-ladder__head">
                        <strong>{role.name}</strong>
                        <span className={`vp-scope-badge${role.companyWide ? ' vp-scope-badge--all' : ''}`}>
                          {role.companyWide ? 'All branches' : 'One branch'}
                        </span>
                        {mine && <span className="vp-you-badge">You</span>}
                      </div>
                      <p>{role.summary}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {myRole && !builtIn && (
              <Tip>
                Your role, <strong>{myRole}</strong>, is a custom role created by your company (rank {roleLevel}). It
                works like the ones above — see <PageLink href="/admin/staff/roles" permission="staff.view">Roles &amp; Permissions</PageLink>{' '}
                for exactly what it includes.
              </Tip>
            )}

            <p className="mb-0">
              In practice: HR (50) can hire sales assistants and branch workers (20) but not a manager (60); a manager
              can hire HR and sales staff but not another manager; an admin (90) can staff any branch.
            </p>
          </Section>

          <Section id="branches" icon="las la-store" title="How branches work">
            <div className="vp-guide-split">
              <div>
                <h6>Branch staff</h6>
                <p className="mb-0">
                  Managers, HR officers, sales assistants, branch workers and any custom role without &ldquo;Works across all
                  branches&rdquo; belong to <strong>one branch</strong>. They only see that branch&apos;s orders, stock,
                  counter sales, staff and reports, and everything they create lands in that branch.
                </p>
              </div>
              <div>
                <h6>Company-wide staff</h6>
                <p className="mb-0">
                  Super admins, admins and any role holding <strong>Works across all branches</strong> see every branch.
                  They choose the branch when they add staff, receive stock or sell at a counter, and can compare branches
                  in the reports.
                </p>
              </div>
            </div>
            <Tip>
              {isCompanyWide ? (
                <>You are company-wide: lists show every branch, and forms ask which branch you mean.</>
              ) : (
                <>
                  You work in <strong>{admin?.branch?.name ?? 'your branch'}</strong>. Records from other branches are not
                  shown to you, and anything you create belongs to your branch.
                </>
              )}
            </Tip>
          </Section>

          <Section id="add-staff" icon="las la-user-plus" title="Adding a staff member">
            <p>
              <strong>Who can:</strong> anyone with permission to add staff — by default super admins, admins, branch
              managers and HR officers. You can only give out roles ranked below your own.
            </p>
            <Steps
              items={[
                <>Go to <PageLink href="/admin/staff" permission="staff.view">Staff → All Staff</PageLink> and press <strong>Add staff</strong>.</>,
                <>Fill in their name, a username they will sign in with, their e-mail and mobile number.</>,
                <>Choose a <strong>role</strong>. The list only offers roles you are allowed to hand out, with a line explaining each one.</>,
                <>
                  Choose a <strong>branch</strong>. Branch staff can only add people to their own branch, so the field is
                  fixed for them. Company-wide staff must pick a branch for a one-branch role, or leave it as &ldquo;All
                  branches&rdquo; for a company-wide role such as Admin.
                </>,
                <>Set a temporary password (8+ characters, upper-case, lower-case and a number) and give it to them in person. Ask them to change it from <strong>Profile → Change password</strong> after their first sign-in.</>,
              ]}
            />
            <Tip>
              To stop someone signing in — they left, or a phone was lost — press <strong>Deactivate</strong> on their row.
              They are signed out everywhere at once. Their history stays.
            </Tip>
          </Section>

          <Section id="custom-roles" icon="las la-user-tag" title="Creating a custom role">
            <p>
              If none of the built-in roles fits, a super admin or admin (anyone with <em>Create and edit roles</em>) can
              make a new one. Example: a <strong>Storekeeper</strong> who books in deliveries and counts stock, but does
              not sell.
            </p>
            <Steps
              items={[
                <>Open <PageLink href="/admin/staff/roles" permission="staff.view">Staff → Roles &amp; Permissions</PageLink> and press <strong>New role</strong>.</>,
                <>Name it &ldquo;Storekeeper&rdquo; and describe it in one line, e.g. &ldquo;Receives deliveries and keeps stock counts right in one branch.&rdquo;</>,
                <>Set the <strong>rank</strong> — e.g. 30. It must be below your own; people ranked above 30 (HR, managers) will be able to manage storekeepers.</>,
                <>Tick the permissions: <em>Inventory → View, Receive new stock, Adjust, History</em> and <em>Catalog → Product view</em>. Leave &ldquo;Works across all branches&rdquo; off so storekeepers stay in their branch.</>,
                <>Save. The role now appears in the role list when adding staff.</>,
              ]}
            />
            <Tip tone="warn">
              You can only put permissions you hold yourself into a role. Built-in roles cannot be renamed or deleted, and a
              custom role cannot be deleted while anyone still has it — move them to another role first.
            </Tip>
          </Section>

          <Section id="selling" icon="las la-cash-register" title="Counter sales and online orders">
            <div className="vp-guide-split">
              <div>
                <h6>
                  <i className="las la-cash-register" aria-hidden="true" /> Point of Sale
                </h6>
                <p className="mb-0">
                  For a customer standing in the shop. Open <PageLink href="/admin/pos" permission="pos.sell">Point of Sale</PageLink>,
                  search the products (only your branch&apos;s stock counts), add them, pick the customer — a registered
                  customer, a walk-in name and phone, or nobody — and choose how they paid: cash (the change is worked out
                  for you), mobile money, card or bank transfer. <em>Complete sale</em> takes the stock off your branch,
                  records the sale under your name for commission, and opens a receipt you can print. The sale appears in
                  Orders as a <em>Counter sale</em>. Changing a price or giving a discount needs <em>Change prices at the
                  counter</em>.
                </p>
              </div>
              <div>
                <h6>
                  <i className="las la-shopping-cart" aria-hidden="true" /> Online orders
                </h6>
                <p className="mb-0">
                  Placed by customers on the website or app. They arrive in <PageLink href="/admin/orders" permission="order.view">Orders</PageLink>{' '}
                  for the branch that will fulfil them. Move each order along — confirm, process, dispatch, deliver — so
                  the customer is kept informed.
                </p>
              </div>
            </div>
          </Section>

          <Section id="stock" icon="las la-dolly" title="Receiving stock vs transfers">
            <div className="vp-guide-split">
              <div>
                <h6>Receive stock</h6>
                <p className="mb-0">
                  New goods arriving from a supplier. Open <PageLink href="/admin/inventory/receive" permission="inventory.receive">Inventory → Receive Stock</PageLink>,
                  pick the branch (fixed for branch staff), enter the supplier and their invoice number, add each product
                  with its quantity and unit cost from the delivery note, and confirm. The branch&apos;s stock goes up at
                  once, the delivery gets a goods-received number (e.g. GRN-DOM-000123) and shows in the movement history.
                  Received stock can&apos;t be edited afterwards — correct mistakes with a stock adjustment.
                </p>
              </div>
              <div>
                <h6>Transfer stock</h6>
                <p className="mb-0">
                  Moving goods you already own from one branch to another. Use <PageLink href="/admin/inventory/transfers" permission="inventory.view">Inventory → Stock Transfers</PageLink>.
                  The sending branch creates and dispatches the transfer (its stock goes down); the receiving branch marks
                  it received (its stock goes up). The company total does not change.
                </p>
              </div>
            </div>
            <Tip>
              Counted the shelf and the number is wrong? That is neither — use an <strong>adjustment</strong> on{' '}
              <PageLink href="/admin/inventory" permission="inventory.view">Branch Stock</PageLink> and give a reason.
            </Tip>
          </Section>

          <Section id="reports" icon="las la-chart-bar" title="Where to find reports">
            <ul className="vp-guide-links">
              <li>
                <PageLink href="/admin" permission="dashboard.view">Dashboard</PageLink> — today&apos;s orders, revenue and low stock at a glance.
              </li>
              <li>
                <PageLink href="/admin/reports/sales" permission="report.sales">Reports → Sales</PageLink> — counter and online sales over any period.
              </li>
              <li>
                <PageLink href="/admin/reports/inventory" permission="report.inventory">Reports → Inventory</PageLink> — stock value, low and out-of-stock items.
              </li>
              <li>
                <PageLink href="/admin/reports/branch-performance" permission="report.branch_performance">Reports → Branch Performance</PageLink> — how branches compare.
              </li>
              <li>
                <PageLink href="/admin/commissions" permission="commission.view_own">Commission</PageLink> — your own earnings{can('commission.view_all') ? ', or the whole team’s' : ''}.
              </li>
              <li>
                <PageLink href="/admin/reports/audit-log" permission="report.audit_log">Reports → Audit Log</PageLink> — who changed what, and when.
              </li>
            </ul>
            <p className="mb-0 text-muted">
              Branch staff see their own branch&apos;s figures; company-wide staff see every branch. Items shown in bold
              rather than as links are outside your role.
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}
