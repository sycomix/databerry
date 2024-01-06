import { DailyLeads, render } from '@chaindesk/emails';
import { generateExcelBuffer } from '@chaindesk/lib/export/excel-export';
import logger from '@chaindesk/lib/logger';
import { mailer } from '@chaindesk/lib/mailer';
import { Lead, Organization, Prisma } from '@chaindesk/prisma';
import { prisma } from '@chaindesk/prisma/client';

async function sendDailyLeads(): Promise<void> {
  try {
    // Your code to fetch leads and generate Excel buffer

    const buffer = await generateExcelBuffer(rows);

    await mailer.sendMail({
      to: 'example@example.com',
      subject: 'Daily Leads',
      attachments: [
        {
          filename: 'leads.xlsx',
          content: buffer as Buffer,
        },
      ],
      html: mailer.renderMailer(
        <DailyLeads
          nbLeads={rows?.length}
          ctaLink={`${process.env.NEXT_PUBLIC_DASHBOARD_URL}/logs`}
        />
      ),
    });
  } catch (error) {
    logger.error('Failed to send daily leads:', error);
  }
}

export default sendDailyLeads;
