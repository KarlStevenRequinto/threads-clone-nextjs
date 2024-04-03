/* eslint-disable camelcase */
// Resource: https://clerk.com/docs/users/sync-data-to-your-backend

// Resource: https://docs.svix.com/receiving/verifying-payloads/why
import { Webhook, WebhookRequiredHeaders } from "svix";
import { headers } from "next/headers";

import { IncomingHttpHeaders } from "http";

import { NextResponse } from "next/server";
import {
    addMemberToCommunity,
    createCommunity,
    deleteCommunity,
    removeUserFromCommunity,
    updateCommunityInfo,
} from "@/lib/actions/community.actions";

// Resource: https://clerk.com/docs/integration/webhooks#supported-events
type EventType =
    | "organization.created"
    | "organizationInvitation.created"
    | "organizationMembership.created"
    | "organizationMembership.deleted"
    | "organization.updated"
    | "organization.deleted";

type Event = {
    data: Record<string, string | number | Record<string, string>[]>;
    object: "event";
    type: EventType;
};

export const POST = async (request: Request) => {
    const payload = await request.json();
    const header = headers();

    const heads = {
        "svix-id": header.get("svix-id"),
        "svix-timestamp": header.get("svix-timestamp"),
        "svix-signature": header.get("svix-signature"),
    };

    const wh = new Webhook(process.env.NEXT_CLERK_WEBHOOK_SECRET || "");

    let evnt: Event | null = null;

    try {
        evnt = wh.verify(JSON.stringify(payload), heads as IncomingHttpHeaders & WebhookRequiredHeaders) as Event;
    } catch (err) {
        return NextResponse.json({ message: err }, { status: 400 });
    }

    const eventType: EventType = evnt?.type!;

    if (eventType === "organization.created") {
        // Resource: https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/CreateOrganization
        const { id, name, slug, logo_url, image_url, created_by } = evnt?.data ?? {};

        try {
            // @ts-ignore
            await createCommunity(
                // @ts-ignore
                id,
                name,
                slug,
                logo_url || image_url,
                "org bio",
                created_by
            );

            return NextResponse.json({ message: "User created" }, { status: 201 });
        } catch (err) {
            console.log(err);
            return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
        }
    }

    if (eventType === "organizationInvitation.created") {
        try {
            // Resource: https://clerk.com/docs/reference/backend-api/tag/Organization-Invitations#operation/CreateOrganizationInvitation
            console.log("Invitation created", evnt?.data);

            return NextResponse.json({ message: "Invitation created" }, { status: 201 });
        } catch (err) {
            console.log(err);

            return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
        }
    }

    if (eventType === "organizationMembership.created") {
        try {
            // Resource: https://clerk.com/docs/reference/backend-api/tag/Organization-Memberships#operation/CreateOrganizationMembership
            const { organization, public_user_data } = evnt?.data;
            console.log("created", evnt?.data);

            // @ts-ignore
            await addMemberToCommunity(organization.id, public_user_data.user_id);

            return NextResponse.json({ message: "Invitation accepted" }, { status: 201 });
        } catch (err) {
            console.log(err);

            return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
        }
    }

    if (eventType === "organizationMembership.deleted") {
        try {
            // Resource: https://clerk.com/docs/reference/backend-api/tag/Organization-Memberships#operation/DeleteOrganizationMembership
            const { organization, public_user_data } = evnt?.data;
            console.log("removed", evnt?.data);

            // @ts-ignore
            await removeUserFromCommunity(public_user_data.user_id, organization.id);

            return NextResponse.json({ message: "Member removed" }, { status: 201 });
        } catch (err) {
            console.log(err);

            return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
        }
    }

    if (eventType === "organization.updated") {
        try {
            // Resource: https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/UpdateOrganization
            const { id, logo_url, name, slug } = evnt?.data;
            console.log("updated", evnt?.data);

            // @ts-ignore
            await updateCommunityInfo(id, name, slug, logo_url);

            return NextResponse.json({ message: "Member removed" }, { status: 201 });
        } catch (err) {
            console.log(err);

            return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
        }
    }

    if (eventType === "organization.deleted") {
        try {
            // Resource: https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/DeleteOrganization
            const { id } = evnt?.data;
            console.log("deleted", evnt?.data);

            // @ts-ignore
            await deleteCommunity(id);

            return NextResponse.json({ message: "Organization deleted" }, { status: 201 });
        } catch (err) {
            console.log(err);

            return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
        }
    }
};
