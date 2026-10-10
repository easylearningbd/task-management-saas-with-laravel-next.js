<?php

namespace App\Policies;

/** A company works only with its own Expense records (CompanyOwnedPolicy). */
class ExpensePolicy extends CompanyOwnedPolicy {}
