dotenv.config();

const prisma = new PrismaClient();

  const ownerEmail = (org as any).memberships[0].user.email as string;
  if (leads?.length <= 0 && ownerEmail) {
    return;
  }

  const header = ['id', 'agent', 'email', 'created_at'];

  const rows = leads.map((each) => [
    each.id,
    each?.agent?.name || '',
    each.email,
    // each.name,
    // each.phone,
    each.createdAt,
  ]);

  const buffer = await generateExcelBuffer<Lead>({ header, rows });

  await mailer.sendMail({
    from: {
      name: 'Chaindesk',
      address: process.env.EMAIL_FROM!,
    },
    to: ownerEmail,
    subject: `🎯 Your Daily Leads`,
    attachments: [
      {
        filename: 'leads.csv',
        content: buffer as Buffer,
      },
    ],
    html: render(
      <DailyLeads
        nbLeads={rows?.length}
        ctaLink={`${process.env.NEXT_PUBLIC_DASHBOARD_URL}/logs`}
      />
    ),
  });
};

(async () => {
  logger.info('Starting cron job: daily-leads');
  const orgs = await prisma.organization.findMany({
    where: {
      subscriptions: {
        some: {
          status: 'active',
        },
      },
    },
    include: {
      memberships: {
        where: {
          role: 'OWNER',
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  logger.info(`Found ${orgs.length} organizations`);

  await pMap(orgs, createReport, {
    concurrency: 1,
  });

  logger.info(`Finished cron job: daily-leads`);
})();
