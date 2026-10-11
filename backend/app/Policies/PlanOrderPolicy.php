<?php

namespace App\Policies;

/** A company works only with its own plan orders (CompanyOwnedPolicy). Super admins review them
 *  through the admin routes, which resolve orders with CrossTenant — never through this policy. */
class PlanOrderPolicy extends CompanyOwnedPolicy {}
